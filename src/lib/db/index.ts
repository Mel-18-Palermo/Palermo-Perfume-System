import "server-only";
import type { PrismaClient } from "./generated/client";
import { createDatabase } from "./connection";

const shared = globalThis as typeof globalThis & { palermoDatabase?: PrismaClient };

/** Lazy construction keeps non-database pages/builds independent of credentials. */
export function getDatabase(): PrismaClient {
  if (!shared.palermoDatabase) shared.palermoDatabase = createDatabase(process.env["DATABASE_URL"]);
  return shared.palermoDatabase;
}
