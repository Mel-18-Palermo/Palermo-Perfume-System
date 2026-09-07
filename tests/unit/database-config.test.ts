import { afterEach, describe, expect, it, vi } from "vitest";
import { assertDevelopmentDatabase, databaseConfiguration } from "../../src/lib/db/connection";

afterEach(() => vi.unstubAllEnvs());
describe("database environment boundary", () => {
  it("rejects missing/malformed connections without echoing their values", () => {
    expect(() => databaseConfiguration(undefined)).toThrow("not configured");
    expect(() => databaseConfiguration("not-a-url-with-private-value")).toThrow("Invalid database connection configuration.");
    expect(() => databaseConfiguration("https://user:private@example.test?schema=palermo")).toThrow("Invalid database connection configuration.");
  });
  it("rejects remote TLS downgrades and unexpected schemas", () => {
    expect(() => databaseConfiguration("postgresql://user:private@example.test/db?schema=palermo")).toThrow("verified TLS");
    expect(() => databaseConfiguration("postgresql://user:private@localhost/db?schema=public")).toThrow("schema must");
    expect(databaseConfiguration("postgresql://user:private@localhost/db?schema=palermo_test").schema).toBe("palermo_test");
  });
  it("requires an explicit isolated target and rejects production for test/seed", () => {
    const value = "postgresql://user:private@localhost/db?schema=palermo_test";
    vi.stubEnv("PALERMO_DATABASE_ENV", "production");
    expect(() => assertDevelopmentDatabase(value, true)).toThrow("isolated");
    vi.stubEnv("PALERMO_DATABASE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(() => assertDevelopmentDatabase(value, true)).toThrow("isolated");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(() => assertDevelopmentDatabase(value, true)).not.toThrow();
    expect(() => assertDevelopmentDatabase(value.replace("palermo_test", "palermo"), true)).toThrow("disposable");
  });
});
