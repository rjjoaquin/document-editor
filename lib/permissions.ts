import { db } from "./prisma";
import { HttpError } from "./auth";
export async function accessibleDocument(
  id: string,
  userId: string,
  ownerOnly = false,
) {
  const document = await db.document.findUnique({
    where: { id },
    include: { owner: true, shares: { include: { user: true } } },
  });
  if (!document) throw new HttpError(404, "Document not found.");
  if (
    document.ownerId !== userId &&
    (ownerOnly || !document.shares.some((s) => s.userId === userId))
  )
    throw new HttpError(
      403,
      "You do not have permission to access this document.",
    );
  return document;
}
