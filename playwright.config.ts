import { defineConfig } from "playwright/test";

const databaseUrl = process.env["TEST_DATABASE_URL"];
if (!databaseUrl) throw new Error("TEST_DATABASE_URL is required for browser E2E tests.");

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 1 : 0,
  workers: 1,
  use: { baseURL: "http://localhost:3100", browserName: "chromium", trace: "retain-on-failure" },
  webServer: {
    command: "pnpm exec next start --port 3100",
    url: "http://localhost:3100/api/health",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: databaseUrl,
      DIRECT_URL: databaseUrl,
      PALERMO_DATABASE_ENV: "development",
      PALERMO_E2E_AUTH: "1",
      PALERMO_E2E_PRODUCTION_SERVER: "1",
      NEXT_TELEMETRY_DISABLED: "1",
      NODE_ENV: "production",
    },
  },
});
