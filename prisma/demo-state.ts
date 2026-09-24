import { createHash } from "node:crypto";
import type { PrismaClient } from "../src/lib/db/generated/client";
import { ids, seedTime } from "./seed-data";

export const demoCustomerEmail = "customer@example.test";
export const demoAdminEmail = "admin@example.test";
export const demoPermissions = ["catalogue:manage", "inventory:manage", "promotions:manage", "reporting:read", "reviews:moderate"] as const;
export type DemoAuthIds = Readonly<{ customer: string; admin: string }>;

const expectedCounts = {
  address: 1, adminAccount: 1, adminRole: 1, cart: 2, cartItem: 1, catalogueCreateRequest: 0,
  collection: 0, collectionPerfume: 0, customer: 2, deliveryMethod: 1, fragranceFamily: 2,
  fragranceIdentity: 1, fragranceNote: 2, fragranceProfile: 1, identitySession: 0, intensity: 1,
  inventoryBalance: 2, inventoryMovement: 3, inventoryReservation: 1, invoice: 1, order: 2,
  orderItem: 2, payment: 2, perfume: 2, perfumeImage: 2, perfumeNote: 2, perfumeSuitability: 0,
  perfumeVariant: 2, permission: 5, productionBatch: 1, profileFavouriteNote: 1, promotion: 0,
  quiz: 1, quizAttempt: 1, quizOption: 1, quizQuestion: 1, quizResponse: 1, recommendationItem: 1,
  recommendationRun: 1, rolePermission: 5, shipment: 1, suitabilityTag: 0, trackingEvent: 1,
  wishlistItem: 0,
  review: 2, loyaltyAccount: 1, loyaltyLedgerEntry: 1, subscription: 1, referralCode: 1, referral: 1,
  promotionalContent: 1, supportConversation: 1, supportMessage: 1, supportFeedback: 1,
};
type DemoCounts = Readonly<Record<keyof typeof expectedCounts, number>>;

function exact(label: string, actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Deterministic demo verification failed for ${label}.`);
  }
}

async function applicationCounts(db: PrismaClient): Promise<DemoCounts> {
  const delegates = {
    address: db.address, adminAccount: db.adminAccount, adminRole: db.adminRole, cart: db.cart,
    cartItem: db.cartItem, catalogueCreateRequest: db.catalogueCreateRequest, collection: db.collection,
    collectionPerfume: db.collectionPerfume, customer: db.customer, deliveryMethod: db.deliveryMethod,
    fragranceFamily: db.fragranceFamily, fragranceIdentity: db.fragranceIdentity, fragranceNote: db.fragranceNote,
    fragranceProfile: db.fragranceProfile, identitySession: db.identitySession, intensity: db.intensity,
    inventoryBalance: db.inventoryBalance, inventoryMovement: db.inventoryMovement,
    inventoryReservation: db.inventoryReservation, invoice: db.invoice, order: db.order, orderItem: db.orderItem,
    payment: db.payment, perfume: db.perfume, perfumeImage: db.perfumeImage, perfumeNote: db.perfumeNote,
    perfumeSuitability: db.perfumeSuitability, perfumeVariant: db.perfumeVariant, permission: db.permission,
    productionBatch: db.productionBatch, profileFavouriteNote: db.profileFavouriteNote, promotion: db.promotion,
    quiz: db.quiz, quizAttempt: db.quizAttempt, quizOption: db.quizOption, quizQuestion: db.quizQuestion,
    quizResponse: db.quizResponse, recommendationItem: db.recommendationItem,
    recommendationRun: db.recommendationRun, rolePermission: db.rolePermission, shipment: db.shipment,
    suitabilityTag: db.suitabilityTag, trackingEvent: db.trackingEvent, wishlistItem: db.wishlistItem,
    review: db.review, loyaltyAccount: db.loyaltyAccount, loyaltyLedgerEntry: db.loyaltyLedgerEntry,
    subscription: db.subscription, referralCode: db.referralCode, referral: db.referral,
    promotionalContent: db.promotionalContent, supportConversation: db.supportConversation,
    supportMessage: db.supportMessage, supportFeedback: db.supportFeedback,
  } as unknown as Record<keyof typeof expectedCounts, { count(): Promise<number> }>;
  const entries = await Promise.all(Object.entries(delegates).map(async ([name, delegate]) =>
    [name, await delegate.count()] as const));
  return Object.fromEntries(entries) as DemoCounts;
}

export type DemoStateSummary = Readonly<{
  counts: DemoCounts;
  customers: unknown;
  administrator: unknown;
  catalogue: unknown;
  carts: unknown;
  orders: unknown;
  inventoryHistory: unknown;
  quiz: unknown;
}>;

/** Read-only verification of all canonical fixtures and the absence of noncanonical application rows. */
export async function verifyDemoState(db: PrismaClient, expectedAuthIds?: DemoAuthIds): Promise<DemoStateSummary> {
  const counts = await applicationCounts(db);
  exact("table counts", counts, expectedCounts);

  const customers = await db.customer.findMany({ orderBy: { email: "asc" }, select: {
    id: true, email: true, name: true, status: true, emailVerifiedAt: true, authUserId: true,
  } });
  exact("customers", customers, [
    { id: ids.customer, email: demoCustomerEmail, name: "Demo Customer", status: "ACTIVE", emailVerifiedAt: seedTime,
      authUserId: expectedAuthIds?.customer ?? customers[0]?.authUserId },
    { id: ids.otherCustomer, email: "other@example.test", name: "Other Demo Customer", status: "ACTIVE", emailVerifiedAt: seedTime, authUserId: null },
  ]);
  if (!customers[0]?.authUserId) throw new Error("Canonical demo customer is not bound to Auth.");

  const administrator = await db.adminAccount.findUnique({ where: { id: ids.admin }, select: {
    id: true, email: true, name: true, active: true, authUserId: true,
    role: { select: { id: true, name: true, active: true,
      permissions: { orderBy: { permission: { code: "asc" } }, select: { permission: { select: { code: true } } } } } },
  } });
  exact("administrator", administrator, {
    id: ids.admin, email: demoAdminEmail, name: "Demo Administrator", active: true,
    authUserId: expectedAuthIds?.admin ?? administrator?.authUserId,
    role: { id: ids.role, name: "Demo technical owner", active: true,
      permissions: demoPermissions.map(code => ({ permission: { code } })) },
  });
  if (!administrator?.authUserId) throw new Error("Canonical demo administrator is not bound to Auth.");

  const catalogue = await db.perfume.findMany({ orderBy: { id: "asc" }, select: {
    id: true, name: true, slug: true, status: true,
    images: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: {
      id: true, url: true, alt: true, sortOrder: true,
    } },
    variants: { orderBy: { id: "asc" }, select: { id: true, sku: true, priceMinor: true, currency: true,
      inventory: { select: { onHand: true, reserved: true, lowStockThreshold: true, updatedAt: true } } } },
  } });
  exact("catalogue and inventory", catalogue, [
    { id: ids.perfume, name: "Demo Citrus", slug: "demo-citrus", status: "ACTIVE",
      images: [{ id: ids.perfumeImage, url: "/catalogue/products/demo-citrus/primary.png",
        alt: "Palermo Demo Citrus Eau de Parfum bottle", sortOrder: 0 }], variants: [{ id: ids.variant,
      sku: "DEMO-CITRUS-50", priceMinor: 12000, currency: "AUD",
      inventory: { onHand: 12, reserved: 2, lowStockThreshold: 3, updatedAt: seedTime } }] },
    { id: ids.woodyPerfume, name: "Demo Woody", slug: "demo-woody", status: "ACTIVE",
      images: [{ id: ids.woodyPerfumeImage, url: "/catalogue/products/demo-woody/primary.png",
        alt: "Palermo Demo Woody Eau de Parfum bottle", sortOrder: 0 }], variants: [{ id: ids.woodyVariant,
      sku: "DEMO-WOODY-50", priceMinor: 15000, currency: "AUD",
      inventory: { onHand: 8, reserved: 0, lowStockThreshold: 3, updatedAt: seedTime } }] },
  ]);

  const carts = await db.cart.findMany({ orderBy: { id: "asc" }, select: {
    id: true, customerId: true, visitorSessionKey: true, status: true, revision: true, updatedAt: true,
    items: { orderBy: { id: "asc" }, select: { id: true, variantId: true, quantity: true } },
  } });
  exact("carts", carts, [
    { id: ids.cart, customerId: ids.customer, visitorSessionKey: null, status: "ACTIVE", revision: 1, updatedAt: seedTime,
      items: [{ id: ids.cartItem, variantId: ids.variant, quantity: 1 }] },
    { id: ids.visitorCart, customerId: null, visitorSessionKey: "synthetic-visitor-cart-hash", status: "ACTIVE", revision: 1,
      updatedAt: seedTime, items: [] },
  ]);

  const orders = await db.order.findMany({ orderBy: { orderNumber: "asc" }, select: {
    id: true, orderNumber: true, status: true, totalMinor: true, currency: true, placedAt: true,
    items: { orderBy: { id: "asc" }, select: { id: true, variantId: true, skuSnapshot: true, nameSnapshot: true,
      unitPriceMinor: true, quantity: true } },
    payment: { select: { id: true, status: true, providerReference: true, updatedAt: true } },
    invoice: { select: { id: true, invoiceNumber: true, totalMinor: true, issuedAt: true } },
    shipment: { select: { id: true, status: true, trackingReference: true, updatedAt: true,
      events: { orderBy: { occurredAt: "asc" }, select: { id: true, status: true, description: true, occurredAt: true } } } },
    reservations: { orderBy: { id: "asc" }, select: { id: true, variantId: true, quantity: true, status: true, expiresAt: true } },
  } });
  exact("orders", orders, [
    { id: ids.paidOrder, orderNumber: "DEMO-001", status: "CONFIRMED", totalMinor: 25000, currency: "AUD", placedAt: seedTime,
      items: [{ id: ids.paidOrderItem, variantId: ids.variant, skuSnapshot: "DEMO-CITRUS-50", nameSnapshot: "Demo Citrus", unitPriceMinor: 12000, quantity: 2 }],
      payment: { id: ids.payment, status: "SUCCEEDED", providerReference: "demo-verified-payment", updatedAt: seedTime },
      invoice: { id: ids.invoice, invoiceNumber: "DEMO-INV-001", totalMinor: 25000, issuedAt: seedTime },
      shipment: { id: ids.shipment, status: "PENDING", trackingReference: "DEMO-TRACK-001", updatedAt: seedTime,
        events: [{ id: ids.trackingEvent, status: "PENDING", description: "Awaiting simulated dispatch.", occurredAt: seedTime }] },
      reservations: [] },
    { id: ids.pendingOrder, orderNumber: "DEMO-002", status: "PLACED", totalMinor: 25000, currency: "AUD", placedAt: seedTime,
      items: [{ id: ids.pendingOrderItem, variantId: ids.variant, skuSnapshot: "DEMO-CITRUS-50", nameSnapshot: "Demo Citrus", unitPriceMinor: 12000, quantity: 2 }],
      payment: { id: ids.pendingPayment, status: "PENDING", providerReference: null, updatedAt: seedTime },
      invoice: null, shipment: null,
      reservations: [{ id: ids.reservation, variantId: ids.variant, quantity: 2, status: "ACTIVE",
        expiresAt: new Date("2026-09-01T00:15:00.000Z") }] },
  ]);

  const inventoryHistory = {
    movements: await db.inventoryMovement.findMany({ orderBy: { id: "asc" }, select: {
      id: true, variantId: true, productionBatchId: true, quantityDelta: true, reason: true, reference: true, createdAt: true,
    } }),
    batches: await db.productionBatch.findMany({ orderBy: { id: "asc" }, select: {
      id: true, variantId: true, batchCode: true, producedQuantity: true, status: true, productionDate: true,
    } }),
  };
  exact("inventory history", inventoryHistory, {
    movements: [
      { id: ids.citrusOpeningMovement, variantId: ids.variant, productionBatchId: null, quantityDelta: 14,
        reason: "DEMO_OPENING_STOCK", reference: "seed-opening-DEMO-CITRUS-50", createdAt: seedTime },
      { id: ids.woodyOpeningMovement, variantId: ids.woodyVariant, productionBatchId: null, quantityDelta: 8,
        reason: "DEMO_OPENING_STOCK", reference: "seed-opening-DEMO-WOODY-50", createdAt: seedTime },
      { id: ids.paidOrderMovement, variantId: ids.variant, productionBatchId: null, quantityDelta: -2,
        reason: "DEMO_ORDER_COMMIT", reference: "seed-paid-order", createdAt: seedTime },
    ],
    batches: [{ id: ids.batch, variantId: ids.variant, batchCode: "DEMO-BATCH-001", producedQuantity: 5,
      status: "RECORDED", productionDate: seedTime }],
  });

  const quiz = await db.quiz.findUnique({ where: { id: ids.quiz }, select: {
    id: true, version: true, active: true,
    questions: { orderBy: { sortOrder: "asc" }, select: { id: true, prompt: true, required: true,
      minSelections: true, maxSelections: true,
      options: { orderBy: { sortOrder: "asc" }, select: { id: true, label: true, value: true } } } },
    attempts: { orderBy: { id: "asc" }, select: { id: true, status: true, customerId: true,
      recommendations: { orderBy: { id: "asc" }, select: { id: true, status: true, providerReference: true,
        items: { orderBy: { rank: "asc" }, select: { perfumeId: true, rank: true, explanation: true } } } } } },
  } });
  exact("quiz and recommendation", quiz, {
    id: ids.quiz, version: "1", active: true,
    questions: [{ id: ids.question, prompt: "Which fragrance family would you like to explore?", required: true,
      minSelections: 1, maxSelections: 1, options: [{ id: ids.option, label: "Citrus", value: ids.family }] }],
    attempts: [{ id: ids.attempt, status: "COMPLETED", customerId: ids.customer,
      recommendations: [{ id: ids.recommendation, status: "FALLBACK", providerReference: null,
        items: [{ perfumeId: ids.perfume, rank: 1,
          explanation: "Synthetic deterministic example; no provider was called." }] }] }],
  });

  return { counts, customers, administrator, catalogue, carts, orders, inventoryHistory, quiz };
}

export function demoStateHash(summary: DemoStateSummary): string {
  return createHash("sha256").update(JSON.stringify(summary)).digest("hex");
}
