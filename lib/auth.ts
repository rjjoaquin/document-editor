import { cookies } from "next/headers";
import { db } from "./prisma";
export async function currentUser() {
  const id = (await cookies()).get("demo-user")?.value ?? "alice";
  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw new HttpError(401, "Select a demo account to continue.");
  return user;
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
