import "../../src/lib/db/load-env";
import { assertDevelopmentDatabase, createDatabase } from "../../src/lib/db/connection";

export const e2e = {
  customerId: "39300000-0000-4000-8000-000000000101",
  adminId: "39300000-0000-4000-8000-000000000102",
  customerAuthId: "39300000-0000-4000-8000-000000000001",
  adminAuthId: "39300000-0000-4000-8000-000000000002",
  roleId: "39300000-0000-4000-8000-000000000103",
  cataloguePermissionId: "39300000-0000-4000-8000-000000000104",
  inventoryPermissionId: "39300000-0000-4000-8000-000000000105",
  familyId: "39300000-0000-4000-8000-000000000106",
  intensityId: "39300000-0000-4000-8000-000000000107",
  perfumeId: "39300000-0000-4000-8000-000000000108",
  variantId: "39300000-0000-4000-8000-000000000109",
  addressId: "39300000-0000-4000-8000-000000000110",
  deliveryId: "39300000-0000-4000-8000-000000000111",
  orderId: "39300000-0000-4000-8000-000000000112",
  shipmentId: "39300000-0000-4000-8000-000000000113",
  unisexCollectionId: "39300000-0000-4000-8000-000000000114",
} as const;

const url = process.env["TEST_DATABASE_URL"];
assertDevelopmentDatabase(url, true);
if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(new URL(url ?? "").hostname)) {
  throw new Error("Browser E2E requires a local disposable PostgreSQL target.");
}
const db = createDatabase(url);
const at = new Date("2026-09-24T00:00:00.000Z");
const address = { recipientName: "E2E Customer", line1: "393 Test Street", line2: null, suburb: "Melbourne", state: "VIC", postcode: "3000", country: "AU" };

try {
  await db.$transaction(async tx => {
    await tx.adminRole.create({ data: { id: e2e.roleId, name: "E2E administrator" } });
    await tx.permission.createMany({ data: [
      { id: e2e.cataloguePermissionId, code: "catalogue:manage", description: "E2E catalogue access" },
      { id: e2e.inventoryPermissionId, code: "inventory:manage", description: "E2E inventory access" },
    ] });
    await tx.rolePermission.createMany({ data: [
      { roleId: e2e.roleId, permissionId: e2e.cataloguePermissionId },
      { roleId: e2e.roleId, permissionId: e2e.inventoryPermissionId },
    ] });
    await tx.adminAccount.create({ data: { id: e2e.adminId, authUserId: e2e.adminAuthId, email: "e2e.admin@example.test", name: "E2E Administrator", roleId: e2e.roleId, createdAt: at } });
    await tx.customer.create({ data: { id: e2e.customerId, authUserId: e2e.customerAuthId, name: "E2E Customer", email: "e2e.customer@example.test", status: "ACTIVE", emailVerifiedAt: at, createdAt: at } });
    await tx.address.create({ data: { id: e2e.addressId, customerId: e2e.customerId, type: "DELIVERY", ...address, updatedAt: at } });
    await tx.fragranceFamily.create({ data: { id: e2e.familyId, name: "E2E Citrus" } });
    await tx.intensity.create({ data: { id: e2e.intensityId, name: "E2E Light" } });
    await tx.collection.create({ data: { id: e2e.unisexCollectionId, name: "Unisex" } });
    await tx.perfume.create({ data: { id: e2e.perfumeId, slug: "e2e-citrus", name: "E2E Citrus", description: "Deterministic browser fixture.", primaryFamilyId: e2e.familyId, intensityId: e2e.intensityId, createdAt: at } });
    await tx.collectionPerfume.create({ data: { collectionId: e2e.unisexCollectionId, perfumeId: e2e.perfumeId } });
    await tx.perfumeVariant.create({ data: { id: e2e.variantId, perfumeId: e2e.perfumeId, sku: "E2E-CITRUS-50", bottleSize: "50 ml", concentration: "Eau de Parfum", priceMinor: 12000, currency: "AUD" } });
    await tx.inventoryBalance.create({ data: { variantId: e2e.variantId, onHand: 8, reserved: 0, lowStockThreshold: 2, updatedAt: at } });
    await tx.deliveryMethod.create({ data: { id: e2e.deliveryId, name: "E2E delivery", chargeMinor: 1000, currency: "AUD", displayInformation: "Deterministic local delivery." } });
    await tx.order.create({ data: { id: e2e.orderId, customerId: e2e.customerId, orderNumber: "E2E-393", idempotencyKey: "e2e-order-393", requestFingerprint: "e2e-order-393", deliveryMethodId: e2e.deliveryId, status: "CONFIRMED", subtotalMinor: 12000, discountTotalMinor: 0, deliveryChargeMinor: 1000, totalMinor: 13000, currency: "AUD", deliveryAddressSnapshot: address, billingAddressSnapshot: address, deliveryMethodSnapshot: { id: e2e.deliveryId, name: "E2E delivery", chargeMinor: 1000, currency: "AUD" }, placedAt: at } });
    await tx.orderItem.create({ data: { orderId: e2e.orderId, variantId: e2e.variantId, skuSnapshot: "E2E-CITRUS-50", nameSnapshot: "E2E Citrus", unitPriceMinor: 12000, quantity: 1 } });
    await tx.payment.create({ data: { orderId: e2e.orderId, status: "SUCCEEDED", providerReference: "e2e-payment", updatedAt: at } });
    await tx.shipment.create({ data: { id: e2e.shipmentId, orderId: e2e.orderId, trackingReference: "E2E-TRACK-393", updatedAt: at } });
    await tx.trackingEvent.create({ data: { shipmentId: e2e.shipmentId, status: "IN_TRANSIT", description: "E2E deterministic transit event.", occurredAt: at } });
  });
  console.log("Seeded minimal deterministic browser E2E fixture.");
} finally { await db.$disconnect(); }
