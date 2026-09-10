import "../src/lib/db/load-env";
import { assertDevelopmentDatabase, createDatabase } from "../src/lib/db/connection";
import { seedCore } from "./seed-data";

async function main(): Promise<void> {
  assertDevelopmentDatabase(process.env["DIRECT_URL"]);
  const db = createDatabase(process.env["DIRECT_URL"]);
  try {
    await seedCore(db);
    console.log("Synthetic seed complete; existing rows were preserved.");
  } finally { await db.$disconnect(); }
}

main().catch(() => {
  console.error("Seed failed. Check the isolated target and migration state; no connection details were logged.");
  process.exitCode = 1;
});
