import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { api, sameOrigin } from "@/lib/api";
import { HttpError } from "@/lib/auth";
export async function POST(request: Request) {
  return api(async () => {
    sameOrigin(request);
    const { userId } = z
      .object({ userId: z.string() })
      .strict()
      .parse(await request.json());
    if (!(await db.user.findUnique({ where: { id: userId } })))
      throw new HttpError(400, "Unknown demo user.");
    (await cookies()).set("demo-user", userId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return Response.json({ ok: true });
  });
}
