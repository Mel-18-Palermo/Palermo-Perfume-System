import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createE2EIdentityProvider, e2eIdentityProviderEnabled } from "../../src/lib/auth/e2e-provider";

const safeEnvironment: NodeJS.ProcessEnv = {
  PALERMO_E2E_AUTH: "1",
  NODE_ENV: "test",
  PALERMO_DATABASE_ENV: "development",
  DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/palermo?schema=palermo_test",
};

describe("E2E identity provider guard", () => {
  it("is disabled without the explicit flag", () => {
    expect(e2eIdentityProviderEnabled({ ...safeEnvironment, PALERMO_E2E_AUTH: undefined })).toBe(false);
  });

  it("activates only for the isolated loopback palermo_test development database", () => {
    expect(e2eIdentityProviderEnabled(safeEnvironment)).toBe(true);
  });

  it("rejects production without the explicit production E2E server flag", () => {
    expect(() => e2eIdentityProviderEnabled({ ...safeEnvironment, NODE_ENV: "production" })).toThrow("safe local test");
  });

  it("allows an explicitly marked production E2E server with the safe database", () => {
    expect(e2eIdentityProviderEnabled({
      ...safeEnvironment,
      NODE_ENV: "production",
      PALERMO_E2E_PRODUCTION_SERVER: "1",
    })).toBe(true);
  });

  it("rejects unsafe databases regardless of the production E2E server flag", () => {
    expect(() => e2eIdentityProviderEnabled({
      ...safeEnvironment,
      NODE_ENV: "production",
      PALERMO_E2E_PRODUCTION_SERVER: "1",
      DATABASE_URL: "postgresql://db.example.com:5432/palermo?schema=palermo_test",
    })).toThrow("safe local test");
    expect(() => e2eIdentityProviderEnabled({
      ...safeEnvironment,
      NODE_ENV: "production",
      PALERMO_E2E_PRODUCTION_SERVER: "1",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/palermo?schema=public",
    })).toThrow("safe local test");
  });

  it("fails closed when the requested environment is unsafe", () => {
    expect(() => e2eIdentityProviderEnabled({ ...safeEnvironment, PALERMO_DATABASE_ENV: "production" })).toThrow("safe local test");
    expect(() => e2eIdentityProviderEnabled({ ...safeEnvironment, PALERMO_DATABASE_ENV: "preview" })).toThrow("safe local test");
    expect(() => e2eIdentityProviderEnabled({ ...safeEnvironment, DATABASE_URL: "postgresql://db.example.com:5432/palermo?schema=palermo_test" })).toThrow("safe local test");
    expect(() => e2eIdentityProviderEnabled({ ...safeEnvironment, DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/palermo?schema=public" })).toThrow("safe local test");
  });

  it("does not permit direct construction outside the safety guard", () => {
    expect(() => createE2EIdentityProvider({ ...safeEnvironment, DATABASE_URL: "postgresql://db.example.com:5432/palermo?schema=palermo_test" })).toThrow("safe local test");
  });
});
