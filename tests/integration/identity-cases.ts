import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import type { IdentityProvider, ProviderIdentity, RecoveryGrant } from "../../src/lib/auth/provider";
import { AuthFault } from "../../src/lib/auth/errors";
import { IdentityService, SESSION_SECONDS } from "../../src/modules/identity/service";
import { handleAuthRequest, SESSION_COOKIE } from "../../src/lib/auth/http";

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
      time = new Date(time.getTime() + SESSION_SECONDS * 1000);
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
      await expect(service.requirePermission(undefined, "catalogue.read")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
      const login = await active();
      await expect(service.requirePermission(login.token, "catalogue.read")).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
    it("loads current admin permissions from DB and immediately respects role/account deactivation", async () => {
      provider.identity = { ...provider.identity, verified: true };
      const role = await db.adminRole.create({ data: { name: "auth-test-role", permissions: { create: { permission: { connectOrCreate: { where: { code: "catalogue.read" }, create: { code: "catalogue.read", description: "Read catalogue" } } } } } } });
      const admin = await db.adminAccount.create({ data: { name: "Synthetic Admin", email, authUserId: provider.identity.id, roleId: role.id } });
      const login = await service.login(input, "ADMIN");
      expect((await service.requirePermission(login.token, "catalogue.read")).user.role).toBe("ADMIN");
      await expect(service.requirePermission(login.token, "admin.manage")).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(service.requireCustomer(login.token)).rejects.toMatchObject({ code: "FORBIDDEN" });
      await db.rolePermission.deleteMany({ where: { roleId: role.id } });
      await expect(service.requirePermission(login.token, "catalogue.read")).rejects.toMatchObject({ code: "FORBIDDEN" });
      await db.adminRole.update({ where: { id: role.id }, data: { active: false } });
      expect(await service.session(login.token)).toEqual({ user: null });
      await db.adminRole.update({ where: { id: role.id }, data: { active: true } });
      await db.adminAccount.update({ where: { id: admin.id }, data: { active: false } });
      expect(await service.session(login.token)).toEqual({ user: null });
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
