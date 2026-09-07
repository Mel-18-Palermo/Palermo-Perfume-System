import { readFileSync } from "node:fs";
import type { PoolConfig } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";

export function databaseConfiguration(value: string | undefined): { pool: PoolConfig; schema: string } {
  if (!value) throw new Error("Database connection is not configured.");
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Invalid database connection configuration."); }
  if (!["postgresql:", "postgres:"].includes(url.protocol) || !url.hostname || !url.username || !url.password) {
    throw new Error("Invalid database connection configuration.");
  }
  const schema = url.searchParams.get("schema");
  if (schema !== "palermo" && schema !== "palermo_test") throw new Error("Database schema must be palermo or palermo_test.");
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
  if (!local && url.searchParams.get("sslmode") !== "verify-full") throw new Error("Remote database connections require verified TLS.");
  // The pg adapter receives TLS settings explicitly; query parameters must not weaken them.
  for (const key of ["schema", "ssl", "sslmode", "sslcert", "sslkey", "sslrootcert", "uselibpqcompat"]) url.searchParams.delete(key);
  const caFile = process.env["DATABASE_CA_FILE"];
  return {
    schema,
    pool: {
      connectionString: url.toString(), max: 5, connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 10_000,
      ssl: local ? false : { rejectUnauthorized: true, ...(caFile ? { ca: readFileSync(caFile, "utf8") } : {}) },
    },
  };
}

export function createDatabase(value: string | undefined): PrismaClient {
  const { pool, schema } = databaseConfiguration(value);
  return new PrismaClient({ adapter: new PrismaPg(pool, { schema }), log: [] });
}

export function assertDevelopmentDatabase(value: string | undefined, test = false): void {
  const environment = process.env["PALERMO_DATABASE_ENV"];
  if (!environment || !["development", "preview"].includes(environment) || process.env["VERCEL_ENV"] === "production") {
    throw new Error("Seed and database tests require an explicit isolated development/preview target.");
  }
  const { schema } = databaseConfiguration(value);
  if (test && schema !== "palermo_test") throw new Error("Database tests require the disposable palermo_test schema.");
}
