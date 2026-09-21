import "../src/lib/db/load-env";
import { assertDevelopmentDatabase, createDatabase } from "../src/lib/db/connection";
import { approvedCatalogueManifest } from "./catalogue-data";
import { assertCatalogueAssets, CatalogueManifestError, populateApprovedCatalogue } from "./catalogue-population";

async function main(): Promise<void> {
  await assertCatalogueAssets(approvedCatalogueManifest);
  const databaseUrl = process.env["DIRECT_URL"];
  assertDevelopmentDatabase(databaseUrl);
  const db = createDatabase(databaseUrl);
  try {
    const result = await populateApprovedCatalogue(db, approvedCatalogueManifest);
    console.log(`Approved catalogue population complete: ${result.products} products, ${result.variants} variants, ${result.images} images.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof CatalogueManifestError
    ? error.message
    : "Catalogue population failed. Check the isolated target, migration state and approved manifest; connection details were not logged.");
  process.exitCode = 1;
});
