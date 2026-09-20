import { describe, expect, it } from "vitest";
import { demoTargetFromEnvironment } from "../../prisma/demo-safety";

const demoRef = "aaaaaaaaaaaaaaaaaaaa";

function environment(overrides: Readonly<Record<string, string | undefined>> = {}): Readonly<Record<string, string | undefined>> {
  return {
    PALERMO_DATABASE_ENV: "development",
    PALERMO_DEMO_SUPABASE_PROJECT_REF: demoRef,
    SUPABASE_URL: `https://${demoRef}.supabase.co`,
    DIRECT_URL: `postgresql://palermo_dev.${demoRef}:secret@aws-0.example.pooler.supabase.com:5432/postgres?schema=palermo&sslmode=verify-full`,
    ...overrides,
  };
}

describe("deterministic demo reset safety", () => {
  it("accepts only an explicitly matched isolated demo project", () => {
    expect(demoTargetFromEnvironment(environment())).toMatchObject({
      schema: "palermo",
      projectRef: demoRef,
      supabaseUrl: `https://${demoRef}.supabase.co`,
    });
  });

  it("fails closed when the environment marker is missing or production", () => {
    expect(() => demoTargetFromEnvironment(environment({ PALERMO_DATABASE_ENV: undefined }))).toThrow("isolated");
    expect(() => demoTargetFromEnvironment(environment({ VERCEL_ENV: "production" }))).toThrow("isolated");
  });

  it("rejects malformed or mismatched demo projects", () => {
    expect(() => demoTargetFromEnvironment(environment({
      PALERMO_DEMO_SUPABASE_PROJECT_REF: "not-a-valid-ref",
    }))).toThrow("project reference");

    expect(() => demoTargetFromEnvironment(environment({
      DIRECT_URL: `postgresql://palermo_dev.bbbbbbbbbbbbbbbbbbbb:secret@aws-0.example.pooler.supabase.com:5432/postgres?schema=palermo&sslmode=verify-full`,
    }))).toThrow("isolated demo project");
  });

  it("rejects mismatched Auth origins and non-application schemas", () => {
    expect(() => demoTargetFromEnvironment(environment({
      SUPABASE_URL: "https://bbbbbbbbbbbbbbbbbbbb.supabase.co",
    }))).toThrow("isolated demo project");
    expect(() => demoTargetFromEnvironment(environment({
      DIRECT_URL: `postgresql://palermo_dev.${demoRef}:secret@aws-0.example.pooler.supabase.com:5432/postgres?schema=palermo_test&sslmode=verify-full`,
    }))).toThrow("isolated demo project");
  });
});
