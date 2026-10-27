import { z } from "zod";
import { db } from "@/lib/prisma";
import { api, serialize, sameOrigin } from "@/lib/api";
import { currentUser, HttpError } from "@/lib/auth";
import { accessibleDocument } from "@/lib/permissions";
import { emptyContent, patchSchema, titleSchema } from "@/lib/validations";
import { importContent } from "@/lib/document-import";
type Context = { params: Promise<{ path?: string[] }> };
export async function GET(_: Request, context: Context) {
  return api(async () => {
    const user = await currentUser();
    const [id, section] = (await context.params).path ?? [];
    if (!id) {
      const docs = await db.document.findMany({
        where: {
          OR: [{ ownerId: user.id }, { shares: { some: { userId: user.id } } }],
        },
        include: { owner: true },
        orderBy: { updatedAt: "desc" },
      });
      return Response.json(docs.map(serialize));
    }
    const doc = await accessibleDocument(id, user.id, section === "shares");
    return Response.json(
      section === "shares" ? doc.shares.map((s) => s.user) : serialize(doc),
    );
  });
}
export async function POST(request: Request, context: Context) {
  return api(async () => {
    sameOrigin(request);
    const user = await currentUser();
    const [id, section] = (await context.params).path ?? [];
    if (id === "import") {
      if (
        Number(request.headers.get("content-length")) >
        2 * 1024 * 1024 + 65536
      )
        throw new HttpError(413, "Files must be 2 MB or smaller.");
      const data = await request.formData();
      const file = data.get("file");
      if (!(file instanceof File))
        throw new HttpError(400, "Choose a TXT or Markdown file.");
      if (file.size > 2 * 1024 * 1024)
        throw new HttpError(413, "Files must be 2 MB or smaller.");
      if (
        !/\.(txt|md)$/i.test(file.name) ||
        ![
          "",
          "text/plain",
          "text/markdown",
          "text/x-markdown",
          "application/octet-stream",
        ].includes(file.type)
      )
        throw new HttpError(400, "Only TXT and Markdown files are supported.");
      const content = importContent(file.name, await file.text());
      const doc = await db.document.create({
        data: {
          title:
            file.name
              .replace(/\.(txt|md)$/i, "")
              .slice(0, 200)
              .trim() || "Imported document",
          content: JSON.stringify(content),
          ownerId: user.id,
        },
      });
      return Response.json(serialize(doc), { status: 201 });
    }
    if (id && section === "shares") {
      await accessibleDocument(id, user.id, true);
      const { userId } = z
        .object({ userId: z.string() })
        .strict()
        .parse(await request.json());
      if (userId === user.id)
        throw new HttpError(400, "The owner already has access.");
      if (!(await db.user.findUnique({ where: { id: userId } })))
        throw new HttpError(404, "User not found.");
      await db.documentShare.create({ data: { documentId: id, userId } });
      return Response.json({ ok: true }, { status: 201 });
    }
    if (id) throw new HttpError(404, "Route not found.");
    const { title } = z
      .object({ title: titleSchema.default("Untitled document") })
      .strict()
      .parse(await request.json());
    return Response.json(
      serialize(
        await db.document.create({
          data: {
            title,
            content: JSON.stringify(emptyContent),
            ownerId: user.id,
          },
        }),
      ),
      { status: 201 },
    );
  });
}
export async function PATCH(request: Request, context: Context) {
  return api(async () => {
    sameOrigin(request);
    const user = await currentUser();
    const [id] = (await context.params).path ?? [];
    if (!id) throw new HttpError(404, "Document not found.");
    if (Number(request.headers.get("content-length")) > 4 * 1024 * 1024)
      throw new HttpError(413, "Document is too large.");
    const input = patchSchema.parse(await request.json());
    const updated = await db.$transaction(async (tx) => {
      const doc = await tx.document.findUnique({
        where: { id },
        include: { shares: true },
      });
      if (!doc) throw new HttpError(404, "Document not found.");
      if (
        doc.ownerId !== user.id &&
        !doc.shares.some((s) => s.userId === user.id)
      )
        throw new HttpError(
          403,
          "Your access to this document has been revoked.",
        );
      if (input.title !== undefined && doc.ownerId !== user.id)
        throw new HttpError(403, "Only the owner can rename this document.");
      const result = await tx.document.updateMany({
        where: { id, version: input.version },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.content ? { content: JSON.stringify(input.content) } : {}),
          version: { increment: 1 },
        },
      });
      if (!result.count)
        throw new HttpError(
          409,
          "Another user saved changes. Your edits are retained. Download your draft, then reload the latest version before continuing.",
        );
      return tx.document.findUniqueOrThrow({ where: { id } });
    });
    return Response.json(serialize(updated));
  });
}
export async function DELETE(request: Request, context: Context) {
  return api(async () => {
    sameOrigin(request);
    const user = await currentUser();
    const [id, section, userId] = (await context.params).path ?? [];
    if (!id) throw new HttpError(404, "Document not found.");
    await accessibleDocument(id, user.id, true);
    if (section === "shares" && userId)
      await db.documentShare.deleteMany({ where: { documentId: id, userId } });
    else if (!section) await db.document.delete({ where: { id } });
    else throw new HttpError(404, "Route not found.");
    return Response.json({ ok: true });
  });
}
