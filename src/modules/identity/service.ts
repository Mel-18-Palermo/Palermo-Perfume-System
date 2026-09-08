import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient } from "../../lib/db/generated/client";
import type { Session, SessionUser } from "../../contracts/auth";
import { AuthFault } from "../../lib/auth/errors";
import type { IdentityProvider, ProviderIdentity } from "../../lib/auth/provider";
import * as validate from "../../lib/auth/validation";

export const SESSION_SECONDS = 24 * 60 * 60;
export type Principal = Readonly<{ user: SessionUser; permissions: readonly string[] }>;
export type LoginResult = Readonly<{ session: Session; token: string; expiresAt: Date }>;
const anonymous: Session = { user: null };
function hash(token: string): string { return createHash("sha256").update(token).digest("hex"); }
function denied(): never { throw new AuthFault("UNAUTHENTICATED", "An active, verified account is required."); }
function isUniqueError(error: unknown): boolean { return typeof error === "object" && error !== null && "code" in error && error.code === "P2002"; }

export class IdentityService {
  constructor(private readonly db: PrismaClient, private readonly provider: IdentityProvider, private readonly now: () => Date = () => new Date()) {}

  async register(value: unknown): Promise<{ status: "PENDING_VERIFICATION" }> {
    const input = validate.object(value);
    const data = { name: validate.name(input["name"]), email: validate.email(input["email"]), password: validate.password(input["password"]) };
    // Claim the canonical email atomically before the provider call; uniqueness is DB enforced.
    const customer = await this.db.customer.create({ data: { name: data.name, email: data.email } }).catch((error: unknown) => {
      if (isUniqueError(error)) throw new AuthFault("CONFLICT", "An account already uses this email address.");
      throw error;
    });
    try {
      const identity = await this.provider.register(data);
      if (identity.email !== data.email || identity.verified) throw new AuthFault("INTEGRATION_ERROR", "Email verification must precede activation.");
      await this.db.customer.update({ where: { id: customer.id }, data: { authUserId: identity.id } });
      return { status: "PENDING_VERIFICATION" };
    } catch (error) {
      await this.db.customer.deleteMany({ where: { id: customer.id, authUserId: null } });
      throw error;
    }
  }

  private async activate(identity: ProviderIdentity): Promise<void> {
    if (!identity.verified) denied();
    const account = await this.db.customer.findUnique({ where: { authUserId: identity.id } });
    if (!account || account.email !== identity.email || account.status === "DEACTIVATED") denied();
    await this.db.customer.updateMany({ where: { id: account.id, status: "PENDING_VERIFICATION" }, data: { status: "ACTIVE", emailVerifiedAt: this.now() } });
  }

  async verify(value: unknown): Promise<{ status: "ACTIVE" }> {
    const input = validate.object(value);
    await this.activate(await this.provider.verify(validate.verificationToken(input["token"])));
    return { status: "ACTIVE" };
  }

  async login(value: unknown, role: "CUSTOMER" | "ADMIN" = "CUSTOMER"): Promise<LoginResult> {
    const input = validate.object(value);
    const email = validate.email(input["email"]);
    const password = validate.password(input["password"]);
    const before = role === "CUSTOMER" ? await this.db.customer.findUnique({ where: { email } }) : null;
    const identity = await this.provider.login(email, password);
    if (!identity.verified || identity.email !== email) denied();
    const token = randomBytes(32).toString("base64url");
    const createdAt = this.now();
    const expiresAt = new Date(createdAt.getTime() + SESSION_SECONDS * 1000);
    if (role === "CUSTOMER") {
      if (!before || before.authUserId !== identity.id || before.status === "DEACTIVATED") denied();
      // Reconcile a provider-confirmed email even if the user completed its hosted verification flow.
      await this.activate(identity);
      const account = await this.db.customer.findUnique({ where: { id: before.id } });
      if (!account || account.status !== "ACTIVE" || !account.emailVerifiedAt || account.authVersion !== before.authVersion) denied();
      await this.db.identitySession.create({ data: { tokenHash: hash(token), customerId: account.id, authVersion: before.authVersion, createdAt, expiresAt } });
      // Every use compares authVersion and account status, including login/deactivation races.
      return { token, expiresAt, session: { user: { id: account.id, role, email: account.email, displayName: account.name } } };
    }
    const account = await this.db.adminAccount.findUnique({ where: { authUserId: identity.id }, include: { role: true } });
    if (!account || account.email !== email || !account.active || !account.role.active) denied();
    await this.db.identitySession.create({ data: { tokenHash: hash(token), adminId: account.id, createdAt, expiresAt } });
    return { token, expiresAt, session: { user: { id: account.id, role, email: account.email, displayName: account.name } } };
  }

  async principal(token: string | undefined): Promise<Principal | null> {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const session = await this.db.identitySession.findUnique({ where: { tokenHash: hash(token) }, include: { customer: true, admin: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
    if (!session || session.expiresAt <= this.now()) return null;
    const customer = session.customer;
    if (customer?.status === "ACTIVE" && customer.emailVerifiedAt && customer.authUserId && customer.authVersion === session.authVersion) {
      return { user: { id: customer.id, role: "CUSTOMER", email: customer.email, displayName: customer.name }, permissions: [] };
    }
    const admin = session.admin;
    if (admin?.active && admin.authUserId && admin.role.active) {
      return { user: { id: admin.id, role: "ADMIN", email: admin.email, displayName: admin.name }, permissions: admin.role.permissions.map(({ permission }) => permission.code) };
    }
    return null;
  }

  async session(token: string | undefined): Promise<Session> { const principal = await this.principal(token); return principal ? { user: principal.user } : anonymous; }

  async requireCustomer(token: string | undefined): Promise<Principal> {
    const principal = await this.principal(token);
    if (!principal) denied();
    if (principal.user.role !== "CUSTOMER") throw new AuthFault("FORBIDDEN", "A customer account is required.");
    return principal;
  }

  async requirePermission(token: string | undefined, permission: string): Promise<Principal> {
    const principal = await this.principal(token);
    if (!principal) denied();
    if (principal.user.role !== "ADMIN" || !principal.permissions.includes(permission)) throw new AuthFault("FORBIDDEN", "This action is not permitted.");
    return principal;
  }

  async logout(token: string | undefined): Promise<void> {
    if (token) await this.db.identitySession.deleteMany({ where: { tokenHash: hash(token) } });
  }

  async deactivate(token: string | undefined): Promise<void> {
    const principal = await this.requireCustomer(token);
    await this.db.$transaction([
      this.db.customer.update({ where: { id: principal.user.id }, data: { status: "DEACTIVATED", deactivatedAt: this.now(), authVersion: { increment: 1 } } }),
      this.db.identitySession.deleteMany({ where: { customerId: principal.user.id } }),
    ]);
  }

  async requestPasswordReset(value: unknown): Promise<void> {
    const input = validate.object(value);
    const email = validate.email(input["email"]);
    // Same outward acknowledgement for unknown, pending and deactivated accounts.
    const account = await this.db.customer.findUnique({ where: { email } });
    if (account?.status === "ACTIVE") await this.provider.requestPasswordReset(email);
  }

  private async revokeCustomerSessions(customerId: string): Promise<void> {
    await this.db.$transaction([
      this.db.customer.update({ where: { id: customerId }, data: { authVersion: { increment: 1 } } }),
      this.db.identitySession.deleteMany({ where: { customerId } }),
    ]);
  }

  async completePasswordReset(value: unknown): Promise<void> {
    const input = validate.object(value);
    const password = validate.password(input["password"]);
    const grant = await this.provider.recover(validate.verificationToken(input["token"]));
    try {
      const account = await this.db.customer.findUnique({ where: { authUserId: grant.identity.id } });
      if (!account || account.status !== "ACTIVE" || account.email !== grant.identity.email || !grant.identity.verified) denied();
      await this.revokeCustomerSessions(account.id);
      try { await grant.changePassword(password); } finally { await this.revokeCustomerSessions(account.id); }
    } finally { await grant.dispose(); }
  }
}
