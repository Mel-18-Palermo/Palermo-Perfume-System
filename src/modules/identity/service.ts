import { createHash, randomBytes } from "node:crypto";
import type { Prisma, PrismaClient } from "../../lib/db/generated/client";
import type { Session, SessionUser } from "../../contracts/auth";
import { AuthFault } from "../../lib/auth/errors";
import type { IdentityProvider, ProviderIdentity } from "../../lib/auth/provider";
import * as validate from "../../lib/auth/validation";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { defaultWebAuthnVerifier, WEBAUTHN_CHALLENGE_SECONDS, type WebAuthnConfig, type WebAuthnVerifier } from "../../lib/auth/webauthn";

export const SESSION_SECONDS = 24 * 60 * 60;
export const SESSION_INACTIVITY_SECONDS = 30 * 60;
export type Principal = Readonly<{ user: SessionUser; permissions: readonly string[] }>;
export type LoginResult = Readonly<{ session: Session; token: string; expiresAt: Date }>;
const anonymous: Session = { user: null };
const principalInclude = { customer: true, admin: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } as const;
type SessionWithPrincipal = Prisma.IdentitySessionGetPayload<{ include: typeof principalInclude }>;
function hash(token: string): string { return createHash("sha256").update(token).digest("hex"); }
function denied(): never { throw new AuthFault("UNAUTHENTICATED", "An active, verified account is required."); }
function isUniqueError(error: unknown): boolean { return typeof error === "object" && error !== null && "code" in error && error.code === "P2002"; }

export class IdentityService {
  constructor(private readonly db: PrismaClient, private readonly provider: IdentityProvider, private readonly now: () => Date = () => new Date(), private readonly webauthn: () => Promise<WebAuthnVerifier> = defaultWebAuthnVerifier) {}

  private async createAdminLogin(account: { id: string; email: string; name: string; active: boolean; role: { active: boolean } }): Promise<LoginResult> {
    if (!account.active || !account.role.active) denied();
    const token = randomBytes(32).toString("base64url");
    const createdAt = this.now(); const expiresAt = new Date(createdAt.getTime() + SESSION_SECONDS * 1000);
    await this.db.identitySession.create({ data: { tokenHash: hash(token), adminId: account.id, createdAt, expiresAt, lastActivityAt: createdAt } });
    return { token, expiresAt, session: { user: { id: account.id, role: "ADMIN", email: account.email, displayName: account.name } } };
  }

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
      await this.db.identitySession.create({ data: { tokenHash: hash(token), customerId: account.id, authVersion: before.authVersion, createdAt, expiresAt, lastActivityAt: createdAt } });
      // Every use compares authVersion and account status, including login/deactivation races.
      return { token, expiresAt, session: { user: { id: account.id, role, email: account.email, displayName: account.name } } };
    }
    const account = await this.db.adminAccount.findUnique({ where: { authUserId: identity.id }, include: { role: true } });
    if (!account || account.email !== email) denied();
    return this.createAdminLogin(account);
  }

  async passkeyRegistrationOptions(adminId: string, config: WebAuthnConfig): Promise<unknown> {
    const account = await this.db.adminAccount.findUnique({ where: { id: adminId }, include: { role: true, passkeys: { where: { revokedAt: null } } } });
    if (!account || !account.active || !account.role.active) denied();
    const { generateRegistrationOptions } = await import("@simplewebauthn/server");
    const options = await generateRegistrationOptions({ rpName: "Palermo", rpID: config.rpID, userName: account.email, userID: Buffer.from(account.id), userDisplayName: account.name, timeout: WEBAUTHN_CHALLENGE_SECONDS * 1000, attestationType: "none", excludeCredentials: account.passkeys.map(value => ({ id: value.credentialId, transports: value.transports })), authenticatorSelection: { residentKey: "preferred", userVerification: "required" } });
    await this.db.webAuthnChallenge.create({ data: { adminId: account.id, email: account.email, challenge: options.challenge, type: "REGISTRATION", expiresAt: new Date(this.now().getTime() + WEBAUTHN_CHALLENGE_SECONDS * 1000) } });
    return options;
  }

  async verifyPasskeyRegistration(adminId: string, response: RegistrationResponseJSON, label: string | null, config: WebAuthnConfig): Promise<void> {
    const challenge = await this.db.webAuthnChallenge.findFirst({ where: { adminId, type: "REGISTRATION", consumedAt: null, expiresAt: { gt: this.now() } }, orderBy: { createdAt: "desc" }, include: { admin: { include: { role: true } } } });
    if (!challenge?.admin || !challenge.admin.active || !challenge.admin.role.active) denied();
    const verified = await (await this.webauthn()).registration(response, { ...config, challenge: challenge.challenge });
    if (!verified.verified || !verified.credential || !verified.credentialDeviceType || verified.credentialBackedUp === undefined) denied();
    const credential = verified.credential;
    const deviceType = verified.credentialDeviceType;
    const backedUp = verified.credentialBackedUp;
    const result = await this.db.$transaction(async tx => {
      const consumed = await tx.webAuthnChallenge.updateMany({ where: { id: challenge.id, consumedAt: null, expiresAt: { gt: this.now() } }, data: { consumedAt: this.now() } });
      if (consumed.count !== 1) return false;
      await tx.adminPasskeyCredential.create({ data: { adminId, credentialId: credential.id, publicKey: new Uint8Array(credential.publicKey), counter: credential.counter, transports: credential.transports ?? [], credentialDeviceType: deviceType, credentialBackedUp: backedUp, label } });
      return true;
    }).catch(error => { if (isUniqueError(error)) denied(); throw error; });
    if (!result) denied();
  }

  async passkeyAuthenticationOptions(email: string, config: WebAuthnConfig): Promise<unknown> {
    const account = await this.db.adminAccount.findUnique({ where: { email }, include: { role: true, passkeys: { where: { revokedAt: null } } } });
    if (!account || !account.active || !account.role.active || account.passkeys.length === 0) denied();
    const { generateAuthenticationOptions } = await import("@simplewebauthn/server");
    const options = await generateAuthenticationOptions({ rpID: config.rpID, timeout: WEBAUTHN_CHALLENGE_SECONDS * 1000, userVerification: "required", allowCredentials: account.passkeys.map(value => ({ id: value.credentialId, transports: value.transports })) });
    await this.db.webAuthnChallenge.create({ data: { adminId: account.id, email: account.email, challenge: options.challenge, type: "AUTHENTICATION", expiresAt: new Date(this.now().getTime() + WEBAUTHN_CHALLENGE_SECONDS * 1000) } });
    return options;
  }

  async verifyPasskeyAuthentication(email: string, response: AuthenticationResponseJSON, config: WebAuthnConfig): Promise<LoginResult> {
    const challenge = await this.db.webAuthnChallenge.findFirst({ where: { email, type: "AUTHENTICATION", consumedAt: null, expiresAt: { gt: this.now() } }, orderBy: { createdAt: "desc" }, include: { admin: { include: { role: true } } } });
    if (!challenge?.admin || !challenge.admin.active || !challenge.admin.role.active) denied();
    const credential = await this.db.adminPasskeyCredential.findFirst({ where: { adminId: challenge.adminId ?? "", credentialId: response.id, revokedAt: null } });
    if (!credential) denied();
    const verified = await (await this.webauthn()).authentication(response, { id: credential.credentialId, publicKey: credential.publicKey, counter: credential.counter, transports: credential.transports }, { ...config, challenge: challenge.challenge });
    if (!verified.verified || verified.newCounter === undefined || !verified.credentialDeviceType || verified.credentialBackedUp === undefined) denied();
    const newCounter = verified.newCounter; const deviceType = verified.credentialDeviceType; const backedUp = verified.credentialBackedUp;
    const consumed = await this.db.$transaction(async tx => {
      const count = await tx.webAuthnChallenge.updateMany({ where: { id: challenge.id, consumedAt: null, expiresAt: { gt: this.now() } }, data: { consumedAt: this.now() } });
      if (count.count !== 1) return false;
      await tx.adminPasskeyCredential.update({ where: { id: credential.id }, data: { counter: newCounter, credentialDeviceType: deviceType, credentialBackedUp: backedUp, lastUsedAt: this.now() } });
      return true;
    });
    if (!consumed) denied();
    return this.createAdminLogin(challenge.admin);
  }

  private principalForSession(session: SessionWithPrincipal | null, now: Date, inactivityDeadline: Date): Principal | null {
    if (!session || session.expiresAt <= now || session.lastActivityAt <= inactivityDeadline) return null;
    const customer = session.customer;
    if (customer?.status === "ACTIVE" && customer.emailVerifiedAt && customer.authUserId && customer.authVersion === session.authVersion) {
      return { user: { id: customer.id, role: "CUSTOMER", email: customer.email, displayName: customer.name }, permissions: [] };
    }
    const admin = session.admin;
    if (admin?.active && admin.role.active) {
      return { user: { id: admin.id, role: "ADMIN", email: admin.email, displayName: admin.name }, permissions: admin.role.permissions.map(({ permission }) => permission.code) };
    }
    return null;
  }

  async principal(token: string | undefined): Promise<Principal | null> {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const now = this.now();
    const inactivityDeadline = new Date(now.getTime() - SESSION_INACTIVITY_SECONDS * 1000);
    const tokenHash = hash(token);
    const session = await this.db.identitySession.findUnique({ where: { tokenHash }, include: principalInclude });
    const principal = this.principalForSession(session, now, inactivityDeadline);
    if (!principal) return null;
    const touched = await this.db.identitySession.updateMany({
      where: {
        tokenHash,
        expiresAt: { gt: now },
        lastActivityAt: { gt: inactivityDeadline, lte: now },
      },
      data: { lastActivityAt: now },
    });
    if (touched.count === 1) return principal;

    // A newer request may have already advanced activity. Revalidate so that
    // losing that monotonic touch race does not turn a valid request anonymous.
    const current = await this.db.identitySession.findUnique({ where: { tokenHash }, include: principalInclude });
    return this.principalForSession(current, now, inactivityDeadline);
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
