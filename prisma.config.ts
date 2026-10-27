import "dotenv/config";
import { closeSync, existsSync, mkdirSync, openSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defineConfig } from "prisma/config";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
// The SQLite engine requires an existing database file on a fresh checkout.
// Resolve from the project root, matching the runtime driver's URL semantics.
if (url.startsWith("file:")) {
  const path = resolve(url.slice(5));
  mkdirSync(dirname(path), { recursive: true });
  if (!existsSync(path)) closeSync(openSync(path, "a"));
}
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url },
});
