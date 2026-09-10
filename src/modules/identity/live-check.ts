import "../../lib/db/load-env";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { assertDevelopmentDatabase, createDatabase } from "../../lib/db/connection";
import { createSupabaseIdentityProvider } from "../../lib/auth/supabase";
import { IdentityService } from "./service";
import type { IdentityProvider } from "../../lib/auth/provider";

// Owner-only integration evidence: generated links never send email or print credentials.
async function main(): Promise<void> {
  assertDevelopmentDatabase(process.env["DATABASE_URL"]);
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Owner test credentials are not configured.");
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const db = createDatabase(process.env["DATABASE_URL"]);
  const provider = createSupabaseIdentityProvider();
  const marker = randomUUID();
  const email = `identity-${marker}@example.test`;
  const password = `Test-${randomUUID()}`;
  const replacement = `Reset-${randomUUID()}`;
  const providerIds: string[] = [];
  let token: string | undefined;
  let roleId: string | undefined;
  function check(value: unknown): asserts value { if (!value) throw new Error("Live identity assertion failed."); }
  const generatedRegistration: IdentityProvider = { ...provider, async register(input) {
    const { data, error } = await admin.auth.admin.generateLink({ type: "signup", email: input.email, password: input.password, options: { data: { name: input.name } } });
    check(!error && data.user && data.properties?.hashed_token);
    providerIds.push(data.user.id);
    token = data.properties.hashed_token;
    return { id: data.user.id, email: input.email, verified: Boolean(data.user.email_confirmed_at) };
  } };
  const service = new IdentityService(db, generatedRegistration);
  try {
    check((await service.register({ name: "Synthetic Identity Check", email, password })).status === "PENDING_VERIFICATION");
    check(token);
    check((await service.verify({ token })).status === "ACTIVE");
    let replayRejected = false;
    try { await service.verify({ token }); } catch { replayRejected = true; }
    check(replayRejected);
    const login = await service.login({ email, password });
    check((await service.session(login.token)).user?.role === "CUSTOMER");
    await service.logout(login.token);
    check((await service.session(login.token)).user === null);
    console.log("Live customer verification, login, logout and verification-replay checks passed.");

    const oldSession = await service.login({ email, password });
    const { data: recovery, error: recoveryError } = await admin.auth.admin.generateLink({ type: "recovery", email });
    check(!recoveryError && recovery.properties?.hashed_token);
    await service.completePasswordReset({ token: recovery.properties.hashed_token, password: replacement });
    check((await service.session(oldSession.token)).user === null);
    const newSession = await service.login({ email, password: replacement });
    await service.deactivate(newSession.token);
    check((await service.session(newSession.token)).user === null);
    console.log("Live password recovery and deactivation/session invalidation checks passed.");

    const adminEmail = `admin-${marker}@example.test`;
    const { data: account, error } = await admin.auth.admin.createUser({ email: adminEmail, password, email_confirm: true });
    check(!error && account.user);
    providerIds.push(account.user.id);
    const role = await db.adminRole.create({ data: { name: `identity-check-${marker}` } });
    roleId = role.id;
    await db.adminAccount.create({ data: { name: "Synthetic Identity Admin", email: adminEmail, authUserId: account.user.id, roleId: role.id } });
    const adminSession = await service.login({ email: adminEmail, password }, "ADMIN");
    check((await service.session(adminSession.token)).user?.role === "ADMIN");
    let denied = false;
    try { await service.requirePermission(adminSession.token, "admin.manage"); } catch { denied = true; }
    check(denied);
    console.log("Live administrator session and deny-by-default permission checks passed.");
  } finally {
    await db.customer.deleteMany({ where: { email } });
    await db.adminAccount.deleteMany({ where: { email: `admin-${marker}@example.test` } });
    if (roleId) await db.adminRole.delete({ where: { id: roleId } });
    for (const id of providerIds) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) console.error("Synthetic provider identity cleanup failed; owner follow-up required.");
    }
    await db.$disconnect();
  }
}

main().catch(() => { console.error("Live identity check failed; provider payloads and credentials are not logged."); process.exitCode = 1; });
