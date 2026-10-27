import { db } from "../lib/prisma";
async function main() {
  for (const name of ["Alice", "Bob", "Charlie"]) {
    const id = name.toLowerCase();
    await db.user.upsert({
      where: { id },
      update: {},
      create: { id, name, email: `${id}@example.com` },
    });
  }
}
main().finally(() => db.$disconnect());
