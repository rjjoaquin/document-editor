import { db } from "@/lib/prisma";
import { api } from "@/lib/api";
import { currentUser } from "@/lib/auth";
export async function GET() {
  return api(async () => {
    const user = await currentUser();
    return Response.json({
      users: await db.user.findMany({ orderBy: { name: "asc" } }),
      currentUser: user,
    });
  });
}
