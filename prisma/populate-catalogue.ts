import "../src/lib/db/load-env";
import { assertDevelopmentDatabase, createDatabase } from "../src/lib/db/connection";
import { approvedCatalogueManifest } from "./catalogue-data";
import { approvedQuizManifest } from "./quiz-data";
import {
  assertCatalogueAssets,
  CatalogueManifestError,
  CataloguePopulationConflictError,
  populateFinalCatalogueAndQuiz,
} from "./catalogue-population";
import { QuizManifestError, QuizPopulationConflictError } from "./quiz-population";

async function main(): Promise<void> {
  await assertCatalogueAssets(approvedCatalogueManifest);
  const databaseUrl = process.env["DIRECT_URL"];
  assertDevelopmentDatabase(databaseUrl);
  const db = createDatabase(databaseUrl);
  try {
    const result = await populateFinalCatalogueAndQuiz(db, approvedCatalogueManifest, approvedQuizManifest);
    console.log(`Approved catalogue and quiz population complete: ${result.products} products, ${result.variants} variants, ${result.images} images.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof CatalogueManifestError || error instanceof CataloguePopulationConflictError
    || error instanceof QuizManifestError || error instanceof QuizPopulationConflictError
    ? error.message
    : "Catalogue population failed. Check the isolated target, migration state and approved manifest; connection details were not logged.");
  process.exitCode = 1;
});
