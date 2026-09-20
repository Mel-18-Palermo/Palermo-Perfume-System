import "../src/lib/db/load-env";
import { createClient, type User } from "@supabase/supabase-js";
import type { Prisma, PrismaClient } from "../src/lib/db/generated/client";
import { createSupabaseIdentityProvider } from "../src/lib/auth/supabase";
import { assertDevelopmentDatabase, createDatabase } from "../src/lib/db/connection";
import { IdentityService } from "../src/modules/identity/service";
import { demoTargetFromEnvironment, type DemoDatabaseSchema } from "./demo-safety";
import {
  demoAdminEmail,
  demoCustomerEmail,
  demoPermissions,
  demoStateHash,
  verifyDemoState,
  type DemoAuthIds,
} from "./demo-state";
import { ids, seedCanonicalRecords } from "./seed-data";

const applicationTables = [
  "RecommendationItem", "RecommendationRun", "QuizResponse", "QuizAttempt", "QuizOption", "QuizQuestion", "Quiz",
  "TrackingEvent", "Shipment", "Invoice", "Payment", "InventoryReservation", "OrderItem", "Order",
  "InventoryMovement", "ProductionBatch", "InventoryBalance", "CartItem", "Cart", "Promotion", "DeliveryMethod",
  "WishlistItem", "CollectionPerfume", "Collection", "PerfumeSuitability", "SuitabilityTag", "PerfumeImage",
  "PerfumeNote", "ProfileFavouriteNote", "FragranceIdentity", "FragranceProfile", "CatalogueCreateRequest",
  "IdentitySession", "RolePermission", "AdminAccount", "Permission", "AdminRole", "Address", "Customer",
  "PerfumeVariant", "Perfume", "FragranceNote", "FragranceFamily", "Intensity",
] as const;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Demo reset requires ${name}.`);
  return value;
}

function adminClient(url: string, serviceRoleKey: string) {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }) },
  });
}
type DemoAdminClient = ReturnType<typeof adminClient>;

async function findDemoAuthUser(client: DemoAdminClient, email: string): Promise<User | null> {
  const matches: User[] = [];
  const perPage = 1_000;
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error("Demo Auth identity lookup failed.");
    matches.push(...data.users.filter(user => user.email?.toLowerCase() === email));
    if (data.users.length < perPage) break;
    if (page === 100) throw new Error("Demo Auth identity lookup exceeded the safe pagination bound.");
  }
  if (matches.length > 1) throw new Error(`Multiple provider identities exist for ${email}.`);
  return matches[0] ?? null;
}

async function reconcileDemoAuthUser(
  client: DemoAdminClient,
  email: typeof demoCustomerEmail | typeof demoAdminEmail,
  password: string,
): Promise<string> {
  if (!email.endsWith("@example.test")) throw new Error("Only canonical synthetic demo identities may be reconciled.");
  const existing = await findDemoAuthUser(client, email);
  const response = existing
    ? await client.auth.admin.updateUserById(existing.id, { email, password, email_confirm: true, ban_duration: "none" })
    : await client.auth.admin.createUser({ email, password, email_confirm: true });
  if (response.error || !response.data.user || response.data.user.email?.toLowerCase() !== email
    || !response.data.user.email_confirmed_at) {
    throw new Error(`Demo Auth identity reconciliation failed for ${email}.`);
  }
  return response.data.user.id;
}

async function provisionDemoAuthIdentities(supabaseUrl: string): Promise<DemoAuthIds> {
  const client = adminClient(supabaseUrl, required("SUPABASE_SERVICE_ROLE_KEY"));
  const customerPassword = required("PALERMO_DEMO_CUSTOMER_PASSWORD");
  const adminPassword = required("PALERMO_DEMO_ADMIN_PASSWORD");
  return {
    customer: await reconcileDemoAuthUser(client, demoCustomerEmail, customerPassword),
    admin: await reconcileDemoAuthUser(client, demoAdminEmail, adminPassword),
  };
}

function quotedTableList(schema: DemoDatabaseSchema): string {
  return applicationTables.map(table => `"${schema}"."${table}"`).join(", ");
}

async function resetApplicationData(
  db: PrismaClient,
  schema: DemoDatabaseSchema,
  authIds: DemoAuthIds,
): Promise<void> {
  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    // Intentionally no CASCADE: unexpected dependencies must stop rather than widen the destructive scope.
    await tx.$executeRawUnsafe(`TRUNCATE TABLE ${quotedTableList(schema)} RESTART IDENTITY`);
    await seedCanonicalRecords(tx);
    await tx.customer.update({ where: { id: ids.customer }, data: { authUserId: authIds.customer } });
    await tx.adminAccount.update({ where: { id: ids.admin }, data: { authUserId: authIds.admin } });
  }, { timeout: 60_000 });
}

async function validateDemoAccounts(db: PrismaClient): Promise<void> {
  // The Palermo provider uses the normal anon boundary; the service-role key remains admin-only.
  required("SUPABASE_ANON_KEY");
  const identity = new IdentityService(db, createSupabaseIdentityProvider());
  let customerToken: string | undefined;
  let adminToken: string | undefined;
  try {
    const customer = await identity.login({ email: demoCustomerEmail, password: required("PALERMO_DEMO_CUSTOMER_PASSWORD") });
    customerToken = customer.token;
    if (customer.session.user?.role !== "CUSTOMER") throw new Error("Demo customer role validation failed.");

    const administrator = await identity.login(
      { email: demoAdminEmail, password: required("PALERMO_DEMO_ADMIN_PASSWORD") },
      "ADMIN",
    );
    adminToken = administrator.token;
    const principal = await identity.principal(adminToken);
    if (principal?.user.role !== "ADMIN"
      || JSON.stringify([...principal.permissions].sort()) !== JSON.stringify([...demoPermissions])) {
      throw new Error("Demo administrator permission validation failed.");
    }
  } finally {
    if (customerToken) await identity.logout(customerToken);
    if (adminToken) await identity.logout(adminToken);
    // A failed validation must not leave either new or pre-reset Palermo sessions behind.
    await db.identitySession.deleteMany();
  }
}

async function main(): Promise<void> {
  // Every destructive entry passes all guards before an admin client or database client is constructed.
  const target = demoTargetFromEnvironment(process.env);
  assertDevelopmentDatabase(target.databaseUrl);
  const authIds = await provisionDemoAuthIdentities(target.supabaseUrl);
  const db = createDatabase(target.databaseUrl);
  try {
    await resetApplicationData(db, target.schema, authIds);
    await verifyDemoState(db, authIds);
    await validateDemoAccounts(db);
    const summary = await verifyDemoState(db, authIds);
    console.log(`Deterministic demo reset and account validation passed. State hash: ${demoStateHash(summary)}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch(() => {
  console.error("Demo reset failed closed. Verify isolated target configuration, credentials, migrations and Auth access; secrets were not logged.");
  process.exitCode = 1;
});
