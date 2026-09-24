import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "../..");

await Promise.all(
  ["test-results", ...(process.argv.includes("--next") ? [".next"] : [])].map((artifact) =>
    rm(resolve(repositoryRoot, artifact), { recursive: true, force: true }),
  ),
);
