import "./src/lib/db/load-env";
import { defineConfig } from "prisma/config";
import { resolve } from "node:path";

function migrationUrl(): string {
  const raw = process.env["DIRECT_URL"];
  if (!raw) return "postgresql://unconfigured@localhost:5432/unconfigured?schema=palermo";
  const url = new URL(raw);
  const certificate = process.env["DATABASE_CA_FILE"];
  if (certificate) url.searchParams.set("sslcert", resolve(certificate));
  url.searchParams.set("sslaccept", "strict");
  return url.toString();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  // generate/validate/build are intentionally possible without credentials.
  datasource: { url: migrationUrl() },
});
