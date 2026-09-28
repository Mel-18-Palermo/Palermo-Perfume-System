import type { PrismaClient } from "../../src/lib/db/generated/client";
import type { HistoryDataset } from "./types";

export type ProtectedCounts = Readonly<{ customers: number; orders: number; reviews: number; supportConversations: number; supportMessages: number; supportFeedback: number; inventoryMovements: number; productionBatches: number; inventoryBalances: readonly Readonly<{ variantId: string; onHand: number; reserved: number; lowStockThreshold: number }>[] }>;
export async function protectedCounts(db: PrismaClient): Promise<ProtectedCounts> {
  const [customers, orders, reviews, supportConversations, supportMessages, supportFeedback, inventoryMovements, productionBatches, inventoryBalances] = await Promise.all([db.customer.count(), db.order.count(), db.review.count(), db.supportConversation.count(), db.supportMessage.count(), db.supportFeedback.count(), db.inventoryMovement.count(), db.productionBatch.count(), db.inventoryBalance.findMany({ select: { variantId: true, onHand: true, reserved: true, lowStockThreshold: true }, orderBy: { variantId: "asc" } })]);
  return { customers, orders, reviews, supportConversations, supportMessages, supportFeedback, inventoryMovements, productionBatches, inventoryBalances };
}

/** Checks only this tool's explicit deterministic namespace; it never adopts unrelated state. */
export async function assertOwnedDatasetCompatible(db: PrismaClient, dataset: HistoryDataset): Promise<"empty" | "identical"> {
  const [customers, orders, payments, invoices, reviews, carts] = await Promise.all([
    db.customer.findMany({ where: { email: { startsWith: "demo-history-v1-" } }, select: { id: true, email: true, authUserId: true } }),
    db.order.findMany({ where: { orderNumber: { startsWith: "PAL-DH-" } }, select: { id: true, orderNumber: true, idempotencyKey: true, totalMinor: true } }),
    db.payment.findMany({ where: { provider: "DEMO_HISTORY_IMPORT" }, select: { id: true, providerReference: true, lastProviderEventId: true } }),
    db.invoice.findMany({ where: { invoiceNumber: { startsWith: "DH-INV-" } }, select: { id: true, invoiceNumber: true } }),
    db.review.findMany({ where: { id: { in: dataset.reviews.map(value => value.id) } }, select: { id: true, customerId: true, perfumeId: true, status: true } }),
    db.cart.findMany({ where: { id: { in: dataset.carts.map(value => value.id) } }, select: { id: true, customerId: true } }),
  ]);
  const present = customers.length + orders.length + payments.length + invoices.length + reviews.length + carts.length;
  if (present === 0) return "empty";
  const same = customers.length === dataset.customers.length && orders.length === dataset.orders.length && payments.length === dataset.payments.length && invoices.length === dataset.invoices.length && reviews.length === dataset.reviews.length && carts.length === dataset.carts.length
    && customers.every(row => dataset.customers.some(value => value.id === row.id && value.email === row.email && row.authUserId === null))
    && orders.every(row => dataset.orders.some(value => value.id === row.id && value.orderNumber === row.orderNumber && value.idempotencyKey === row.idempotencyKey && value.totalMinor === row.totalMinor))
    && payments.every(row => dataset.payments.some(value => value.id === row.id && value.providerReference === row.providerReference && value.lastProviderEventId === row.lastProviderEventId))
    && invoices.every(row => dataset.invoices.some(value => value.id === row.id && value.invoiceNumber === row.invoiceNumber))
    && reviews.every(row => dataset.reviews.some(value => value.id === row.id && value.customerId === row.customerId && value.perfumeId === row.perfumeId && value.status === row.status))
    && carts.every(row => dataset.carts.some(value => value.id === row.id && value.customerId === row.customerId));
  if (!same) throw new Error("Existing owned demo-history rows differ from the requested immutable dataset.");
  return "identical";
}

export async function persistHistory(db: PrismaClient, dataset: HistoryDataset): Promise<"inserted" | "noop"> {
  const state = await assertOwnedDatasetCompatible(db, dataset); if (state === "identical") return "noop";
  const before = await protectedCounts(db);
  await db.$transaction(async tx => {
    await tx.customer.createMany({ data: [...dataset.customers] }); await tx.address.createMany({ data: [...dataset.addresses] });
    await tx.order.createMany({ data: [...dataset.orders] }); await tx.orderItem.createMany({ data: [...dataset.orderItems] }); await tx.payment.createMany({ data: [...dataset.payments] }); await tx.invoice.createMany({ data: [...dataset.invoices] });
    await tx.shipment.createMany({ data: [...dataset.shipments] }); await tx.trackingEvent.createMany({ data: [...dataset.trackingEvents] }); await tx.review.createMany({ data: [...dataset.reviews] }); await tx.wishlistItem.createMany({ data: [...dataset.wishlists] }); await tx.cart.createMany({ data: [...dataset.carts] }); await tx.cartItem.createMany({ data: [...dataset.cartItems] });
  }, { timeout: 90_000 });
  const after = await protectedCounts(db);
  if (JSON.stringify(before.inventoryBalances) !== JSON.stringify(after.inventoryBalances) || before.inventoryMovements !== after.inventoryMovements || before.productionBatches !== after.productionBatches || before.supportConversations !== after.supportConversations || before.supportMessages !== after.supportMessages || before.supportFeedback !== after.supportFeedback) throw new Error("History population changed protected inventory or support state.");
  return "inserted";
}
