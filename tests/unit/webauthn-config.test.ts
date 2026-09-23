import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { sameApprovedOrigin, webAuthnConfig } from "../../src/lib/auth/webauthn-config";

afterEach(() => vi.unstubAllEnvs());

function request(url: string, origin?: string, forwarded?: string): Request {
  return new Request(url, { headers: { ...(origin ? { origin } : {}), ...(forwarded ? { "x-forwarded-host": forwarded, "x-forwarded-proto": "https" } : {}) } });
}

describe("WebAuthn deployment origin configuration", () => {
  it("derives localhost and 127.0.0.1 only for local development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(webAuthnConfig(request("http://localhost:3000/api/auth/admin-passkey/register/options"))).toEqual({ rpID: "localhost", origin: "http://localhost:3000" });
    expect(webAuthnConfig(request("http://127.0.0.1:3000/api/auth/admin-passkey/register/options"))).toEqual({ rpID: "127.0.0.1", origin: "http://127.0.0.1:3000" });
  });

  it("derives only the exact Vercel Preview request authority and accepts its matching Origin", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL_ENV", "preview");
    const value = request("https://palermo-git-383-team.vercel.app/api/auth/admin-passkey/register/options", "https://palermo-git-383-team.vercel.app");
    expect(webAuthnConfig(value)).toEqual({ rpID: "palermo-git-383-team.vercel.app", origin: "https://palermo-git-383-team.vercel.app" });
    expect(sameApprovedOrigin(value)).toBe(true);
    expect(sameApprovedOrigin(request("https://palermo-git-383-team.vercel.app/api/auth/admin-passkey/register/options", "https://other-preview.vercel.app"))).toBe(false);
  });

  it("fails closed for production .vercel.app hosts without explicit configuration", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL_ENV", "production");
    expect(() => webAuthnConfig(request("https://palermo.vercel.app/api/auth/admin-passkey/register/options"))).toThrow("PALERMO_WEBAUTHN_RP_ID");
  });

  it("accepts explicit production configuration and rejects a mismatching Origin", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("PALERMO_WEBAUTHN_RP_ID", "admin.palermo.example"); vi.stubEnv("PALERMO_WEBAUTHN_ORIGIN", "https://admin.palermo.example");
    const value = request("https://internal-deployment.vercel.app/api/auth/admin-passkey/register/options", "https://admin.palermo.example");
    expect(webAuthnConfig(value)).toEqual({ rpID: "admin.palermo.example", origin: "https://admin.palermo.example" });
    expect(sameApprovedOrigin(value)).toBe(true);
    expect(sameApprovedOrigin(request("https://internal-deployment.vercel.app/api/auth/admin-passkey/register/options", "https://attacker.example"))).toBe(false);
  });

  it("does not use forwarded host or protocol values when approving an origin", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL_ENV", "preview");
    const value = request("https://unapproved.example/api/auth/admin-passkey/register/options", "https://preview.vercel.app", "preview.vercel.app");
    expect(() => webAuthnConfig(value)).toThrow();
    expect(sameApprovedOrigin(value)).toBe(false);
  });
});
