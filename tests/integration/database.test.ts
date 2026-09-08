import "../../src/lib/db/load-env";
import { readFile, readdir } from "node:fs/promises";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertDevelopmentDatabase, createDatabase, databaseConfiguration } from "../../src/lib/db/connection";
import { ids, seedCore, seedId } from "../../prisma/seed-data";
import { identityCases } from "./identity-cases";
import { catalogueCases } from "./catalogue-cases";
import { cartCases } from "./cart-cases";
import { profileCases } from "./profile-cases";
import { wishlistCases } from "./wishlist-cases";

const testUrl = process.env["TEST_DATABASE_URL"];
assertDevelopmentDatabase(testUrl, true);
const configuration = databaseConfiguration(testUrl);
const pool = new Pool({ ...configuration.pool, max: 1 });
const db = createDatabase(testUrl);
identityCases(db);
catalogueCases(db);
cartCases(db);
profileCases(db);
wishlistCases(db);

beforeAll(async () => {
  await pool.query("SET search_path = palermo_test");
  // Only the explicitly configured disposable schema is cleared. Never drop the database/schema.
  await pool.query(`DO $$ DECLARE object record; BEGIN
    FOR object IN SELECT tablename FROM pg_tables WHERE schemaname = 'palermo_test' LOOP
      EXECUTE format('DROP TABLE IF EXISTS palermo_test.%I CASCADE', object.tablename);
    END LOOP;
    FOR object IN SELECT p.oid::regprocedure AS name FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='palermo_test' LOOP
      EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', object.name);
    END LOOP;
    FOR object IN SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='palermo_test' AND t.typtype='e' LOOP
      EXECUTE format('DROP TYPE IF EXISTS palermo_test.%I CASCADE', object.typname);
    END LOOP;
  END $$`);
  for (const path of (await readdir("prisma/migrations", { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()) {
    await pool.query(await readFile(`prisma/migrations/${path}/migration.sql`, "utf8"));
  }
  await seedCore(db);
});
afterAll(async () => { await db.$disconnect(); await pool.end(); });

async function rejectsConstraint(sql: string, values: readonly unknown[], code: "23505" | "23503" | "23514"): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await expect(client.query(sql, [...values])).rejects.toMatchObject({ code });
  } finally { await client.query("ROLLBACK"); client.release(); }
}

describe("Prisma/PostgreSQL milestone foundation", () => {
  it("applies every migration to a clean isolated schema and connects through Prisma", async () => {
    expect(await db.customer.count()).toBe(2);
    expect(await db.perfume.count()).toBe(2);
    expect(await db.order.count()).toBe(2);
    expect(await db.invoice.count()).toBe(1);
    const order = await db.order.findUniqueOrThrow({ where: { id: ids.paidOrder }, include: { payment: true, invoice: true, shipment: true } });
    expect(order.payment?.status).toBe("SUCCEEDED");
    expect(order.invoice?.totalMinor).toBe(order.totalMinor);
    expect(order.shipment?.status).toBe("PENDING");
  });
  it("repeats the synthetic seed without duplicating rows or changing existing stock", async () => {
    const before = await db.inventoryBalance.findMany({ orderBy: { variantId: "asc" } });
    const movements = await db.inventoryMovement.count();
    await seedCore(db);
    expect(await db.inventoryBalance.findMany({ orderBy: { variantId: "asc" } })).toEqual(before);
    expect(await db.inventoryMovement.count()).toBe(movements);
    expect(await db.order.count()).toBe(2);
    expect(await db.quizResponse.count()).toBe(1);
  });
  it("keeps the private schemas inaccessible to public/browser database roles", async () => {
    const result = await pool.query<{ anonymous: boolean; authenticated: boolean }>(
      "SELECT has_schema_privilege('anon','palermo','USAGE') AS anonymous, has_schema_privilege('authenticated','palermo','USAGE') AS authenticated");
    expect(result.rows[0]).toEqual({ anonymous: false, authenticated: false });
  });
  it("enforces unique canonical customer email", async () => {
    await rejectsConstraint('UPDATE "Customer" SET email=$1 WHERE id=$2', ["customer@example.test", ids.otherCustomer], "23505");
    await rejectsConstraint('UPDATE "Customer" SET email=$1 WHERE id=$2', ["MixedCase@example.test", ids.otherCustomer], "23514");
  });
  it("rejects an active customer without verification", async () => {
    await rejectsConstraint('UPDATE "Customer" SET "emailVerifiedAt"=NULL WHERE id=$1', [ids.customer], "23514");
  });
  it("permits only one current address of each type and preserves customer references", async () => {
    await rejectsConstraint('INSERT INTO "Address" SELECT $1, "customerId", type, "recipientName", line1, line2, suburb, state, postcode, country, "updatedAt" FROM "Address" WHERE id=$2', [seedId(900), ids.address], "23505");
    await rejectsConstraint('UPDATE "Address" SET "customerId"=$1 WHERE id=$2', [seedId(999), ids.address], "23503");
  });
  it("requires exactly one cart owner and one active customer cart", async () => {
    await rejectsConstraint('UPDATE "Cart" SET "customerId"=NULL WHERE id=$1', [ids.cart], "23514");
    await rejectsConstraint('UPDATE "Cart" SET "visitorSessionKey"=$1 WHERE id=$2', ["another-visitor", ids.cart], "23514");
    await rejectsConstraint('INSERT INTO "Cart" (id,"customerId","updatedAt") VALUES ($1,$2,now())', [seedId(901), ids.customer], "23505");
  });
  it("rejects missing variants and non-positive cart quantities", async () => {
    await rejectsConstraint('UPDATE "CartItem" SET "variantId"=$1 WHERE id=$2', [seedId(999), ids.cartItem], "23503");
    await rejectsConstraint('UPDATE "CartItem" SET quantity=0 WHERE id=$1', [ids.cartItem], "23514");
  });
  it("enforces unique SKUs and non-negative integer minor-unit prices", async () => {
    await rejectsConstraint('UPDATE "PerfumeVariant" SET sku=$1 WHERE id=$2', ["DEMO-CITRUS-50", ids.woodyVariant], "23505");
    await rejectsConstraint('UPDATE "PerfumeVariant" SET "priceMinor"=-1 WHERE id=$1', [ids.variant], "23514");
  });
  it("preserves order and item snapshots", async () => {
    await rejectsConstraint('UPDATE "Order" SET "deliveryAddressSnapshot"=$1 WHERE id=$2', [JSON.stringify({ line1: "Changed" }), ids.paidOrder], "23514");
    await rejectsConstraint('UPDATE "OrderItem" SET quantity=3 WHERE "orderId"=$1', [ids.paidOrder], "23514");
  });
  it("enforces checkout replay identity per customer", async () => {
    await rejectsConstraint(`INSERT INTO "Order" (id,"customerId","orderNumber","idempotencyKey","requestFingerprint","deliveryMethodId","subtotalMinor","discountTotalMinor","deliveryChargeMinor","totalMinor",currency,"deliveryAddressSnapshot","billingAddressSnapshot","deliveryMethodSnapshot")
      SELECT $1,"customerId",'DEMO-DUPLICATE',"idempotencyKey","requestFingerprint","deliveryMethodId","subtotalMinor","discountTotalMinor","deliveryChargeMinor","totalMinor",currency,"deliveryAddressSnapshot","billingAddressSnapshot","deliveryMethodSnapshot" FROM "Order" WHERE id=$2`, [seedId(902), ids.paidOrder], "23505");
  });
  it("enforces one payment, invoice and shipment per order", async () => {
    await rejectsConstraint('INSERT INTO "Payment" (id,"orderId","updatedAt") VALUES ($1,$2,now())', [seedId(903), ids.paidOrder], "23505");
    await rejectsConstraint('INSERT INTO "Shipment" (id,"orderId","updatedAt") VALUES ($1,$2,now())', [seedId(904), ids.paidOrder], "23505");
    await rejectsConstraint('INSERT INTO "Invoice" (id,"orderId","invoiceNumber","totalMinor",currency,"paymentReferenceSnapshot") VALUES ($1,$2,$3,25000,$4,$5)',
      [seedId(905), ids.paidOrder, "DEMO-DUPLICATE-INV", "AUD", "demo-verified-payment"], "23505");
  });
  it("rejects invoices before verified payment", async () => {
    await rejectsConstraint('INSERT INTO "Invoice" (id,"orderId","invoiceNumber","totalMinor",currency,"paymentReferenceSnapshot") VALUES ($1,$2,$3,25000,$4,$5)',
      [seedId(906), ids.pendingOrder, "DEMO-UNPAID-INV", "AUD", "unverified"], "23514");
  });
  it("prevents stock below zero or reservation beyond on-hand stock", async () => {
    await rejectsConstraint('UPDATE "InventoryBalance" SET "onHand"=-1 WHERE "variantId"=$1', [ids.variant], "23514");
    await rejectsConstraint('UPDATE "InventoryBalance" SET reserved=13 WHERE "variantId"=$1', [ids.variant], "23514");
    await rejectsConstraint('UPDATE "InventoryReservation" SET quantity=0 WHERE id=$1', [ids.reservation], "23514");
  });
  it("keeps the movement ledger append-only and replay references unique", async () => {
    await rejectsConstraint('UPDATE "InventoryMovement" SET "quantityDelta"=100 WHERE reference=$1', ["seed-paid-order"], "23514");
    await rejectsConstraint('INSERT INTO "InventoryMovement" (id,"variantId","quantityDelta",reason,reference) VALUES ($1,$2,1,$3,$4)',
      [seedId(907), ids.variant, "DEMO", "seed-paid-order"], "23505");
  });
  it("requires release metadata and matching batch/variant references", async () => {
    await rejectsConstraint('UPDATE "ProductionBatch" SET status=$1 WHERE id=$2', ["RELEASED", ids.batch], "23514");
    await rejectsConstraint('INSERT INTO "InventoryMovement" (id,"variantId","productionBatchId","quantityDelta",reason,reference) VALUES ($1,$2,$3,5,$4,$5)',
      [seedId(908), ids.woodyVariant, ids.batch, "DEMO_RELEASE", "test-wrong-variant"], "23503");
  });
  it("requires simulator confirmation data for delivered shipments", async () => {
    await rejectsConstraint('UPDATE "Shipment" SET status=$1 WHERE id=$2', ["DELIVERED", ids.shipment], "23514");
  });
  it("keeps quiz responses linked to the correct question and quiz", async () => {
    await rejectsConstraint('UPDATE "QuizResponse" SET "questionId"=$1 WHERE "attemptId"=$2', [seedId(999), ids.attempt], "23503");
    await rejectsConstraint('UPDATE "RecommendationItem" SET rank=0 WHERE "runId"=$1', [ids.recommendation], "23514");
  });
});
