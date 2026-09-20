import "../src/lib/db/load-env";
import { assertDevelopmentDatabase, createDatabase } from "../src/lib/db/connection";
import { demoTargetFromEnvironment } from "./demo-safety";
import { demoStateHash, verifyDemoState } from "./demo-state";

async function main(): Promise<void> {
  const target = demoTargetFromEnvironment(process.env);
  assertDevelopmentDatabase(target.databaseUrl);
  const db = createDatabase(target.databaseUrl);
  try {
    const summary = await verifyDemoState(db);
    console.log(`Deterministic demo state verified. State hash: ${demoStateHash(summary)}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch(() => {
  console.error("Demo state verification failed. Target details and secrets were not logged.");
  process.exitCode = 1;
});
