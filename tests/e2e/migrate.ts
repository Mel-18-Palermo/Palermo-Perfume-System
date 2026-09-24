import "../../src/lib/db/load-env";
import { spawn } from "node:child_process";
import { assertDevelopmentDatabase } from "../../src/lib/db/connection";

const url = process.env["TEST_DATABASE_URL"];
assertDevelopmentDatabase(url, true);

const parsed = new URL(url ?? "");
if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsed.hostname)) {
  throw new Error("Browser E2E requires a local disposable PostgreSQL target.");
}
if (parsed.searchParams.get("schema") !== "palermo_test") {
  throw new Error("Browser E2E requires the disposable palermo_test schema.");
}

const migration = spawn("pnpm", ["db:migrate"], {
  env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  stdio: "inherit",
});

const exitCode = await new Promise<number>((resolve, reject) => {
  migration.once("error", reject);
  migration.once("exit", code => resolve(code ?? 1));
});

if (exitCode !== 0) {
  throw new Error(`E2E migration failed with exit code ${exitCode}.`);
}
