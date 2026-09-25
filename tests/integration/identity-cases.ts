import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import type { IdentityProvider, ProviderIdentity, RecoveryGrant } from "../../src/lib/auth/provider";
import { AuthFault } from "../../src/lib/auth/errors";
import { IdentityService, SESSION_INACTIVITY_SECONDS, SESSION_SECONDS } from "../../src/modules/identity/service";
import { handleAuthRequest, SESSION_COOKIE } from "../../src/lib/auth/http";
import type { WebAuthnVerifier } from "../../src/lib/auth/webauthn";
import { ids } from "../../prisma/seed-data";

const password = "synthetic-only-password-244";
const email = "auth-test-customer@example.test";
const verification = "a".repeat(64);
const recovery = "b".repeat(64);

class TestProvider implements IdentityProvider {
  identity: ProviderIdentity = { id: randomUUID(), email, verified: false };
  used = false;
  recovered = false;
  resetRequests = 0;
  changed = false;
  disposed = false;
  failRegistration = false;
  afterLogin: (() => Promise<void>) | undefined;
  async register(): Promise<ProviderIdentity> {
    if (this.failRegistration) throw new AuthFault("TEMPORARILY_UNAVAILABLE", "Provider unavailable.");
    return this.identity;
  }
  async verify(token: string): Promise<ProviderIdentity> {
    if (token !== verification || this.used) throw new AuthFault("UNAUTHENTICATED", "Invalid verification.");
    this.used = true;
    this.identity = { ...this.identity, verified: true };
    return this.identity;
  }
  async login(_email: string, supplied: string): Promise<ProviderIdentity> {
    if (supplied !== (this.changed ? "replacement-password-244" : password)) throw new AuthFault("UNAUTHENTICATED", "Invalid credentials.");
    await this.afterLogin?.();
    return this.identity;
  }
  async requestPasswordReset(): Promise<void> { this.resetRequests++; }
  async recover(token: string): Promise<RecoveryGrant> {
    if (token !== recovery || this.recovered) throw new AuthFault("UNAUTHENTICATED", "Invalid recovery.");
    this.recovered = true;
    return { identity: this.identity, changePassword: async () => { this.changed = true; }, dispose: async () => { this.disposed = true; } };
  }
}

export function identityCases(db: PrismaClient): void {
  describe("identity lifecycle and server authorization", () => {
    let provider: TestProvider;
    let service: IdentityService;
    let time: Date;
    async function cleanup() {
      await db.identitySession.deleteMany();
      await db.customer.deleteMany({ where: { email: { startsWith: "auth-test-" } } });
      await db.adminAccount.deleteMany({ where: { email: { startsWith: "auth-test-" } } });
      await db.adminRole.deleteMany({ where: { name: "auth-test-role" } });
    }
    afterAll(cleanup);
    beforeEach(async () => {
      await cleanup();
      provider = new TestProvider();
      time = new Date("2026-09-08T00:00:00Z");
      service = new IdentityService(db, provider, () => time);
    });
    const input = { name: "Synthetic Customer", email, password };
    async function active() {
      await service.register(input);
      await service.verify({ token: verification });
      return service.login(input);
    }
    function request(operation: string, data: unknown, token?: string, origin = "https://palermo.example.test") {
      return new Request(`https://palermo.example.test/api/auth/${operation}`, { method: "POST", headers: { "content-type": "application/json", origin, ...(token ? { cookie: `${SESSION_COOKIE}=${token}` } : {}) }, body: JSON.stringify(data) });
    }

    it("registers only approved fields, normalizes unique email and remains pending", async () => {
      expect(await service.register({ ...input, email: ` ${email.toUpperCase()} `, role: "ADMIN" })).toEqual({ status: "PENDING_VERIFICATION" });
      const account = await db.customer.findUniqueOrThrow({ where: { email } });
      expect(account.status).toBe("PENDING_VERIFICATION");
      expect(account.emailVerifiedAt).toBeNull();
      expect(account.authUserId).toBe(provider.identity.id);
      await expect(service.register(input)).rejects.toMatchObject({ code: "CONFLICT" });
      expect(await db.adminAccount.count({ where: { authUserId: provider.identity.id } })).toBe(0);
    });
    it("rejects invalid and oversized credentials before creating an account", async () => {
      for (const data of [{ ...input, name: " " }, { ...input, email: "invalid" }, { ...input, password: "short" }, { ...input, password: "😀".repeat(30) }]) {
        await expect(service.register(data)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
      }
      expect(await db.customer.count({ where: { email } })).toBe(0);
    });
    it("does not leave a claimed application email after provider registration failure", async () => {
      provider.failRegistration = true;
      await expect(service.register(input)).rejects.toMatchObject({ code: "TEMPORARILY_UNAVAILABLE" });
      expect(await db.customer.count({ where: { email } })).toBe(0);
    });
    it("rejects unverified login and invalid or replayed verification", async () => {
      await service.register(input);
      await expect(service.login(input)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
      await expect(service.verify({ token: "c".repeat(64) })).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
      expect(await service.verify({ token: verification })).toEqual({ status: "ACTIVE" });
      await expect(service.verify({ token: verification })).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
      expect(await db.customer.count({ where: { email } })).toBe(1);
    });
    it("does not activate another account from a mismatched provider identity", async () => {
      await service.register(input);
      provider.identity = { ...provider.identity, id: randomUUID() };
      await expect(service.verify({ token: verification })).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
      expect((await db.customer.findUniqueOrThrow({ where: { email } })).status).toBe("PENDING_VERIFICATION");
    });
    it("reconciles hosted email verification at login without granting admin authority", async () => {
      await service.register(input);
      provider.identity = { ...provider.identity, verified: true };
      expect((await service.login(input)).session.user?.role).toBe("CUSTOMER");
      await expect(service.login(input, "ADMIN")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    });
    it("stores only token hashes, expires sessions and rejects guessed credentials", async () => {
      const login = await active();
      expect((await db.identitySession.findFirstOrThrow()).tokenHash).not.toBe(login.token);
      expect((await service.session(login.token)).user?.id).toBe(login.session.user?.id);
      expect(await service.session("guessed")).toEqual({ user: null });
      time = new Date(time.getTime() + SESSION_INACTIVITY_SECONDS * 1000);
      expect(await service.session(login.token)).toEqual({ user: null });
    });
    it("refreshes activity before inactivity expiry but never extends the absolute deadline", async () => {
      const login = await active();
      const startedAt = time;
      time = new Date(startedAt.getTime() + (SESSION_INACTIVITY_SECONDS - 1) * 1000);
      expect((await service.session(login.token)).user?.id).toBe(login.session.user?.id);
      expect((await db.identitySession.findFirstOrThrow()).lastActivityAt).toEqual(time);
      time = new Date(startedAt.getTime() + (SESSION_INACTIVITY_SECONDS * 2 - 2) * 1000);
      expect((await service.session(login.token)).user?.id).toBe(login.session.user?.id);
      time = new Date(startedAt.getTime() + SESSION_SECONDS * 1000);
      expect(await service.session(login.token)).toEqual({ user: null });
    });
    it("does not revive an inactivity-expired session after later requests", async () => {
      const login = await active();
      time = new Date(time.getTime() + SESSION_INACTIVITY_SECONDS * 1000);
      expect(await service.session(login.token)).toEqual({ user: null });
      time = new Date(time.getTime() + 60_000);
      expect(await service.session(login.token)).toEqual({ user: null });
    });
    it("logout invalidates the current credential including replay and is idempotent", async () => {
      const login = await active();
      await service.logout(login.token);
      await service.logout(login.token);
      expect(await service.session(login.token)).toEqual({ user: null });
    });
    it("deactivation invalidates every session and cannot be undone by login or verification", async () => {
      const first = await active();
      const second = await service.login(input);
      await service.deactivate(first.token);
      expect(await service.session(first.token)).toEqual({ user: null });
      expect(await service.session(second.token)).toEqual({ user: null });
      expect(await db.identitySession.count()).toBe(0);
      await expect(service.login(input)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
      provider.used = false;
      await expect(service.verify({ token: verification })).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    });
    it("denies anonymous and customer requests at the permission boundary", async () => {
      await expect(service.requirePermission(undefined, "catalogue:manage")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
      await expect(service.requirePermission(undefined, "reporting:read")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
      const login = await active();
      await expect(service.requirePermission(login.token, "catalogue:manage")).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(service.requirePermission(login.token, "reporting:read")).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
    it("loads current admin permissions from DB and immediately respects role/account deactivation", async () => {
      provider.identity = { ...provider.identity, verified: true };
      const role = await db.adminRole.create({ data: { name: "auth-test-role", permissions: { create: { permission: { connectOrCreate: { where: { code: "catalogue.read" }, create: { code: "catalogue.read", description: "Read catalogue" } } } } } } });
      const admin = await db.adminAccount.create({ data: { name: "Synthetic Admin", email, authUserId: provider.identity.id, roleId: role.id } });
      const login = await service.login(input, "ADMIN");
      expect((await service.requirePermission(login.token, "catalogue.read")).user.role).toBe("ADMIN");
      await expect(service.requirePermission(login.token, "catalogue:manage")).rejects.toMatchObject({ code: "FORBIDDEN" });
      await db.rolePermission.create({ data: { roleId: role.id, permissionId: ids.permission } });
      expect((await service.requirePermission(login.token, "catalogue:manage")).user.role).toBe("ADMIN");
      await expect(service.requireCustomer(login.token)).rejects.toMatchObject({ code: "FORBIDDEN" });
      await db.rolePermission.deleteMany({ where: { roleId: role.id } });
      await expect(service.requirePermission(login.token, "catalogue.read")).rejects.toMatchObject({ code: "FORBIDDEN" });
      await db.adminRole.update({ where: { id: role.id }, data: { active: false } });
      expect(await service.session(login.token)).toEqual({ user: null });
      await db.adminRole.update({ where: { id: role.id }, data: { active: true } });
      await db.adminAccount.update({ where: { id: admin.id }, data: { active: false } });
      expect(await service.session(login.token)).toEqual({ user: null });
    });
    it("applies the same inactivity boundary to administrator sessions", async () => {
      provider.identity = { ...provider.identity, verified: true };
      const role = await db.adminRole.create({ data: { name: "auth-test-role", permissions: { create: { permission: { connect: { id: ids.permission } } } } } });
      await db.adminAccount.create({ data: { name: "Synthetic Admin", email, authUserId: provider.identity.id, roleId: role.id } });
      const login = await service.login(input, "ADMIN");
      time = new Date(time.getTime() + (SESSION_INACTIVITY_SECONDS - 1) * 1000);
      expect((await service.session(login.token)).user?.role).toBe("ADMIN");
      time = new Date(time.getTime() + SESSION_INACTIVITY_SECONDS * 1000);
      expect(await service.session(login.token)).toEqual({ user: null });
    });
    it("persists and verifies administrator passkeys using ordinary Palermo sessions", async () => {
      const role = await db.adminRole.create({ data: { name: "auth-test-role", permissions: { create: { permission: { connect: { id: ids.permission } } } } } });
      const admin = await db.adminAccount.create({ data: { name: "Passkey Admin", email, roleId: role.id } });
      const verifier: WebAuthnVerifier = {
        registration: async () => ({ verified: true, credential: { id: "credential-test", publicKey: new Uint8Array([1, 2, 3]), counter: 1, transports: ["internal"] }, credentialDeviceType: "multiDevice", credentialBackedUp: true }),
        authentication: async () => ({ verified: true, newCounter: 2, credentialDeviceType: "multiDevice", credentialBackedUp: true }),
      };
      service = new IdentityService(db, provider, () => time, async () => verifier);
      const config = { rpID: "palermo.example.test", origin: "https://palermo.example.test" };
      await service.passkeyRegistrationOptions(admin.id, config);
      await service.verifyPasskeyRegistration(admin.id, { id: "credential-test" } as never, "Work Mac", config);
      expect(await db.adminPasskeyCredential.findFirstOrThrow({ where: { adminId: admin.id } })).toMatchObject({ label: "Work Mac", counter: 1 });
      await service.passkeyAuthenticationOptions(email, config);
      const login = await service.verifyPasskeyAuthentication(email, { id: "credential-test" } as never, config);
      expect(login.session.user?.role).toBe("ADMIN");
      expect((await service.principal(login.token))?.permissions).toContain("catalogue:manage");
      expect((await db.adminPasskeyCredential.findFirstOrThrow({ where: { adminId: admin.id } })).counter).toBe(2);
    });
    it("does not accept expired, replayed, revoked, inactive-account, or inactive-role passkey authentication", async () => {
      const role = await db.adminRole.create({ data: { name: "auth-test-role" } });
      const admin = await db.adminAccount.create({ data: { name: "Passkey Admin", email, roleId: role.id } });
      const credential = await db.adminPasskeyCredential.create({ data: { adminId: admin.id, credentialId: "credential-test", publicKey: new Uint8Array([1]), counter: 0, transports: [], credentialDeviceType: "singleDevice", credentialBackedUp: false } });
      const verifier: WebAuthnVerifier = { registration: async () => ({ verified: false, credential: undefined, credentialDeviceType: undefined, credentialBackedUp: undefined }), authentication: async (_response, _credential, expected) => ({ verified: expected.origin === config.origin, newCounter: 1, credentialDeviceType: "singleDevice", credentialBackedUp: false }) };
      service = new IdentityService(db, provider, () => time, async () => verifier); const config = { rpID: "palermo.example.test", origin: "https://palermo.example.test" };
      await service.passkeyAuthenticationOptions(email, config); time = new Date(time.getTime() + 301_000);
      await expect(service.verifyPasskeyAuthentication(email, { id: credential.credentialId } as never, config)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
      time = new Date("2026-09-08T00:00:00Z"); await service.passkeyAuthenticationOptions(email, config);
      await expect(service.verifyPasskeyAuthentication(email, { id: credential.credentialId } as never, { ...config, origin: "https://attacker.example" })).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
      await db.adminPasskeyCredential.update({ where: { id: credential.id }, data: { revokedAt: time } });
      await expect(service.passkeyAuthenticationOptions(email, config)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
      await db.adminPasskeyCredential.update({ where: { id: credential.id }, data: { revokedAt: null } }); await db.adminAccount.update({ where: { id: admin.id }, data: { active: false } });
      await expect(service.passkeyAuthenticationOptions(email, config)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
      await db.adminAccount.update({ where: { id: admin.id }, data: { active: true } }); await db.adminRole.update({ where: { id: role.id }, data: { active: false } });
      await expect(service.passkeyAuthenticationOptions(email, config)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    });
    it("does not touch a session after auth-version invalidation", async () => {
      const login = await active();
      const before = await db.identitySession.findFirstOrThrow();
      await db.customer.update({ where: { id: before.customerId ?? "" }, data: { authVersion: { increment: 1 } } });
      time = new Date(time.getTime() + 60_000);
      expect(await service.session(login.token)).toEqual({ user: null });
      expect((await db.identitySession.findFirstOrThrow()).lastActivityAt).toEqual(before.lastActivityAt);
    });
    it("authenticates both concurrent valid requests without moving activity backwards", async () => {
      const login = await active();
      const startedAt = time;
      const stale = new IdentityService(db, provider, () => new Date(startedAt.getTime() + 5 * 60_000));
      time = new Date(startedAt.getTime() + 10 * 60_000);

      const originalFindUnique = db.identitySession.findUnique.bind(db.identitySession);
      let releaseStaleRead: () => void = () => undefined;
      const staleReadReady = new Promise<void>(resolve => { releaseStaleRead = resolve; });
      let signalStaleRead: () => void = () => undefined;
      const staleReadStarted = new Promise<void>(resolve => { signalStaleRead = resolve; });
      let firstRead = true;
      const findUnique = vi.spyOn(db.identitySession, "findUnique").mockImplementation((async (...args: Parameters<typeof db.identitySession.findUnique>) => {
        const session = await originalFindUnique(...args);
        if (firstRead) {
          firstRead = false;
          signalStaleRead();
          await staleReadReady;
        }
        return session;
      }) as never);
      try {
        const staleRequest = stale.session(login.token);
        await staleReadStarted;
        expect((await service.session(login.token)).user?.id).toBe(login.session.user?.id);
        const refreshed = await db.identitySession.findFirstOrThrow();
        releaseStaleRead();
        expect((await staleRequest).user?.id).toBe(login.session.user?.id);
        expect((await db.identitySession.findFirstOrThrow()).lastActivityAt).toEqual(refreshed.lastActivityAt);

        await db.customer.update({ where: { id: refreshed.customerId ?? "" }, data: { authVersion: { increment: 1 } } });
        expect(await stale.session(login.token)).toEqual({ user: null });
        await db.identitySession.delete({ where: { tokenHash: refreshed.tokenHash } });
        expect(await service.session(login.token)).toEqual({ user: null });
      } finally { findUnique.mockRestore(); }
    });
    it("reset requests acknowledge ineligible accounts without sending recovery email", async () => {
      await service.requestPasswordReset({ email });
      await service.register(input);
      await service.requestPasswordReset({ email });
      expect(provider.resetRequests).toBe(0);
      await service.verify({ token: verification });
      await service.requestPasswordReset({ email });
      expect(provider.resetRequests).toBe(1);
    });
    it("password reset changes only the verified identity, revokes sessions and consumes its token", async () => {
      const login = await active();
      await service.completePasswordReset({ token: recovery, password: "replacement-password-244" });
      expect(provider.changed).toBe(true);
      expect(provider.disposed).toBe(true);
      expect(await service.session(login.token)).toEqual({ user: null });
      await expect(service.login(input)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
      await expect(service.completePasswordReset({ token: recovery, password })).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    });
    it("rejects a login that authenticated concurrently with credential revocation", async () => {
      await active();
      provider.afterLogin = async () => { await db.customer.update({ where: { email }, data: { authVersion: { increment: 1 } } }); };
      await expect(service.login(input)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    });
    it("HTTP boundary rejects cross-origin writes, malformed JSON and oversized input", async () => {
      const crossOrigin = await handleAuthRequest(request("register", input, undefined, "https://attacker.example"), "register", () => service);
      expect(crossOrigin.status).toBe(403);
      expect((await handleAuthRequest(request("register", { ...input, name: "x".repeat(9000) }), "register", () => service)).status).toBe(400);
      const malformed = new Request("https://palermo.example.test/api/auth/register", { method: "POST", headers: { origin: "https://palermo.example.test", "content-type": "application/json" }, body: "{" });
      expect((await handleAuthRequest(malformed, "register", () => service)).status).toBe(400);
      expect(await db.customer.count({ where: { email } })).toBe(0);
    });
    it("HTTP login puts the opaque credential only in an HttpOnly cookie and logout clears it", async () => {
      await active();
      const response = await handleAuthRequest(request("login", input), "login", () => service);
      expect(response.status).toBe(200);
      const cookie = response.headers.get("set-cookie");
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=lax");
      expect(response.headers.get("cache-control")).toBe("no-store");
      const data: unknown = await response.json();
      expect(data).toMatchObject({ ok: true, data: { user: { role: "CUSTOMER" } } });
      expect(data).not.toHaveProperty("data.token");
      const token = cookie?.split(";")[0]?.split("=")[1];
      const loggedOut = await handleAuthRequest(request("logout", {}, token), "logout", () => service);
      expect(loggedOut.headers.get("set-cookie")).toContain("1970");
      expect(await service.session(token)).toEqual({ user: null });
    });
  });
}
