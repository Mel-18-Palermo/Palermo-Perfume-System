import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "../..");

await Promise.all(
  [".next", "test-results"].map((artifact) =>
    rm(resolve(repositoryRoot, artifact), { recursive: true, force: true }),
  ),
);
