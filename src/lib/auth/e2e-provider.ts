import "server-only";
import type { IdentityProvider, ProviderIdentity, RecoveryGrant } from "./provider";
import { AuthFault } from "./errors";

// These credentials only exist in the disposable browser-E2E fixture. This
// provider is deliberately not a general login or impersonation mechanism.
const identities = new Map<string, { password: string; identity: ProviderIdentity }>([
  ["e2e.customer@example.test", { password: "e2e-customer-password-393", identity: { id: "39300000-0000-4000-8000-000000000001", email: "e2e.customer@example.test", verified: true } }],
  ["e2e.admin@example.test", { password: "e2e-admin-password-393", identity: { id: "39300000-0000-4000-8000-000000000002", email: "e2e.admin@example.test", verified: true } }],
]);

export function e2eIdentityProviderEnabled(environment: NodeJS.ProcessEnv = process.env): boolean {
  const requested = environment["PALERMO_E2E_AUTH"] === "1";
  if (!requested) return false;

  const databaseUrl = environment["DATABASE_URL"];
  let databaseIsSafe = false;
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      databaseIsSafe = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)
        && url.searchParams.get("schema") === "palermo_test";
    } catch {
      databaseIsSafe = false;
    }
  }

  const safe = environment["NODE_ENV"] !== "production"
    && environment["PALERMO_DATABASE_ENV"] === "development"
    && databaseIsSafe;
  if (!safe) throw new Error("E2E identity provider was requested outside its safe local test environment.");
  return true;
}

export function createE2EIdentityProvider(environment: NodeJS.ProcessEnv = process.env): IdentityProvider {
  if (!e2eIdentityProviderEnabled(environment)) {
    throw new Error("E2E identity provider can only be created in its safe local test environment.");
  }
  return {
    async register() { throw new AuthFault("UNAUTHENTICATED", "E2E identity registration is unavailable."); },
    async verify() { throw new AuthFault("UNAUTHENTICATED", "E2E identity verification is unavailable."); },
    async login(email, password) {
      const record = identities.get(email.trim().toLowerCase());
      if (!record || password !== record.password) throw new AuthFault("UNAUTHENTICATED", "Invalid credentials.");
      return record.identity;
    },
    async requestPasswordReset() {},
    async recover(): Promise<RecoveryGrant> { throw new AuthFault("UNAUTHENTICATED", "E2E password recovery is unavailable."); },
  };
}
