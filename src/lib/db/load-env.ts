import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

// Process-provided deployment variables take precedence over local development files.
for (const path of [".env.local", ".env"]) {
  if (existsSync(path)) loadEnvFile(path);
}
