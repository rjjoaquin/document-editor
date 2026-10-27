import { db } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { Dashboard } from "@/components/dashboard";
export default async function Page() {
  const user = await currentUser();
  const [users, documents] = await Promise.all([
    db.user.findMany({ orderBy: { name: "asc" } }),
    db.document.findMany({
      where: {
        OR: [{ ownerId: user.id }, { shares: { some: { userId: user.id } } }],
      },
      include: { owner: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  return (
    <>
      <Header user={user} users={users} />
      <Dashboard
        userId={user.id}
        documents={documents.map((d) => ({
          ...d,
          content: JSON.parse(d.content),
          updatedAt: d.updatedAt.toISOString(),
        }))}
      />
    </>
  );
}
