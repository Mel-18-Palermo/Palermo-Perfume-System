import "../src/lib/db/load-env";
import { createDatabase } from "../src/lib/db/connection";

async function main(): Promise<void> {
  const db = createDatabase(process.env["DATABASE_URL"]);
  try {
    await db.$queryRaw`SELECT 1`;
    const perfumes = await db.perfume.count();
    console.log(`Prisma connectivity passed; ${perfumes} catalogue records available.`);
  } finally { await db.$disconnect(); }
}

main().catch(() => {
  console.error("Database check failed. Verify the local connection, TLS and applied migrations; credentials were not logged.");
  process.exitCode = 1;
});
