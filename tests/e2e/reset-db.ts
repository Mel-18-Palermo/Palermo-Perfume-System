import "../../src/lib/db/load-env";
import { Pool } from "pg";
import { assertDevelopmentDatabase, databaseConfiguration } from "../../src/lib/db/connection";

const url = process.env["TEST_DATABASE_URL"];
assertDevelopmentDatabase(url, true);
const configuration = databaseConfiguration(url);
if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(new URL(url ?? "").hostname)) {
  throw new Error("Browser E2E requires a local disposable PostgreSQL target.");
}
const pool = new Pool({ ...configuration.pool, max: 1 });

try {
  await pool.query("DROP SCHEMA IF EXISTS palermo_test CASCADE");
  await pool.query("CREATE SCHEMA palermo_test");
  console.log("Reset disposable palermo_test schema.");
} finally {
  await pool.end();
}
