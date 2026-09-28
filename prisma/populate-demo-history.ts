import "../src/lib/db/load-env";
import { approvedCatalogueManifest } from "./catalogue-data";
import { createDatabase, databaseConfiguration } from "../src/lib/db/connection";
import { generateHistory } from "./demo-history/generator";
import { assertOwnedDatasetCompatible, persistHistory, protectedCounts } from "./demo-history/persistence";
import { assertHistoryApplySafety } from "./demo-history/safety";
import { historyProfile, type HistoryInput } from "./demo-history/types";
import { validateHistory } from "./demo-history/validation";

type Options = Readonly<{ profile: string; seed: number; asOf: Date; target?: string; apply: boolean; confirm?: string }>;
function options(argv: readonly string[]): Options {
  const values = new Map(argv.map(value => { const [key, ...rest] = value.replace(/^--/, "").split("="); return [key, rest.join("=")] as const; }));
  const profile = values.get("profile") ?? historyProfile; const seed = Number(values.get("seed")); const asOf = new Date(values.get("as-of") ?? "");
  if (profile !== historyProfile || !Number.isSafeInteger(seed) || !Number.isFinite(asOf.valueOf())) throw new Error("Use --profile=presentation-v1, an integer --seed, and an ISO --as-of timestamp.");
  const target = values.get("target"); const confirm = values.get("confirm");
  return { profile, seed, asOf, ...(target ? { target } : {}), apply: values.has("apply"), ...(confirm ? { confirm } : {}) };
}
function print(dataset: ReturnType<typeof generateHistory>, target: string, input: HistoryInput, protectedState: Awaited<ReturnType<typeof protectedCounts>>, mode: string): void {
  const status = { approved: 0, pending: 0, hidden: 0 }; for (const review of dataset.reviews) status[review.status.toLowerCase() as keyof typeof status] += 1;
  console.log(`Palermo synthetic history — ${mode}\n\nTarget:             ${target}\nProfile:            ${input.profile}\nSeed:               ${input.seed}\nAs of:              ${input.asOf.toISOString()}\nCutover:            ${input.cutover.toISOString()}\n\nExisting protected state\n  customers:        ${protectedState.customers}\n  orders:           ${protectedState.orders}\n  reviews:          ${protectedState.reviews}\n  support chats:    ${protectedState.supportConversations}\n\nGenerated dataset\n  customers:        ${dataset.customers.length}\n  orders:           ${dataset.orders.length}\n  order items:      ${dataset.orderItems.length}\n  payments:         ${dataset.payments.length}\n  invoices:         ${dataset.invoices.length}\n  shipments:        ${dataset.shipments.length}\n  tracking events:  ${dataset.trackingEvents.length}\n  reviews:\n    approved:       ${status.approved ?? 0}\n    pending:        ${status.pending ?? 0}\n    hidden:         ${status.hidden ?? 0}\n  active carts:     ${dataset.carts.length}\n  wishlist items:   ${dataset.wishlists.length}\n\nInventory mutation: NONE\nProvider calls:     NONE\nDatabase mutation:  ${mode === "DRY RUN" ? "NO" : "YES"}`);
}
async function main(): Promise<void> {
  const parsed = options(process.argv.slice(2)); assertHistoryApplySafety(parsed);
  const direct = process.env["DIRECT_URL"]; const config = databaseConfiguration(direct); const target = parsed.target ?? config.schema;
  if (parsed.target && parsed.target !== config.schema) throw new Error("Requested target does not match the DIRECT_URL schema.");
  if (parsed.apply && target !== "palermo_prod") throw new Error("Apply target must resolve to palermo_prod.");
  const db = createDatabase(direct);
  try {
    const manifestProducts = approvedCatalogueManifest.products;
    const variants = await db.perfumeVariant.findMany({ where: { id: { in: manifestProducts.flatMap(product => product.variants.map(variant => variant.id)) }, perfume: { is: { status: "ACTIVE" } } }, select: { id: true, perfumeId: true, sku: true, priceMinor: true, currency: true, availability: true, perfume: { select: { name: true } } } });
    if (variants.length !== manifestProducts.reduce((total, product) => total + product.variants.length, 0)) throw new Error("Approved catalogue products/variants are incomplete or conflicting in the target schema.");
    const productRows = await db.perfume.findMany({ where: { id: { in: manifestProducts.map(product => product.id) } }, select: { id: true, createdAt: true } });
    if (productRows.length !== manifestProducts.length) throw new Error("Approved catalogue products are missing from the target schema.");
    const cutover = new Date(Math.min(...productRows.map(product => product.createdAt.getTime()))); const delivery = await db.deliveryMethod.findFirst({ where: { active: true, currency: "AUD" }, orderBy: { id: "asc" } }); const moderator = await db.adminAccount.findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } });
    if (!delivery || !moderator) throw new Error("A suitable active AUD delivery method and canonical moderator are required.");
    const input: HistoryInput = { profile: historyProfile, seed: parsed.seed, asOf: parsed.asOf, cutover, variants: variants.map(variant => ({ ...variant, perfumeName: variant.perfume.name })), moderatorId: moderator.id, delivery };
    const dataset = generateHistory(input); validateHistory(dataset, input); const before = await protectedCounts(db); const ownership = await assertOwnedDatasetCompatible(db, dataset);
    print(dataset, target, input, before, parsed.apply ? (ownership === "identical" ? "IDEMPOTENT NO-OP" : "APPLY") : "DRY RUN");
    if (parsed.apply && ownership === "empty") await persistHistory(db, dataset);
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Synthetic history population failed. Check target identity, schema state, approved catalogue and immutable owned rows; no connection details were logged."); process.exitCode = 1; });
