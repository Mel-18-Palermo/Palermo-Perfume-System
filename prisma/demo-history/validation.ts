import type { HistoryDataset, HistoryInput } from "./types";

function unique(label: string, values: readonly string[]): void { if (new Set(values).size !== values.length) throw new Error(`Generated ${label} contains duplicate identities.`); }
function present<T>(value: T | undefined): T { if (value === undefined) throw new Error("Generated relationship is missing."); return value; }

/** Pure validation: the generator never relies on database errors for domain consistency. */
export function validateHistory(dataset: HistoryDataset, input: HistoryInput): void {
  unique("IDs", [
    ...dataset.customers.map(value => value.id), ...dataset.addresses.map(value => value.id), ...dataset.orders.map(value => value.id), ...dataset.orderItems.map(value => value.id), ...dataset.payments.map(value => value.id), ...dataset.invoices.map(value => value.id), ...dataset.shipments.map(value => value.id), ...dataset.trackingEvents.map(value => value.id), ...dataset.reviews.map(value => value.id), ...dataset.carts.map(value => value.id), ...dataset.cartItems.map(value => value.id),
  ]);
  unique("customer emails", dataset.customers.map(value => value.email));
  if (dataset.customers.some(value => !value.email.endsWith(".test") || value.authUserId !== null || value.createdAt > value.emailVerifiedAt)) throw new Error("Generated customer identity is invalid.");
  const orderById = new Map(dataset.orders.map(value => [value.id, value])); const paymentByOrder = new Map(dataset.payments.map(value => [value.orderId, value])); const shipmentByOrder = new Map(dataset.shipments.map(value => [value.orderId, value]));
  const variants = new Map(input.variants.map(value => [value.id, value]));
  for (const order of dataset.orders) {
    if (order.subtotalMinor - order.discountTotalMinor + order.deliveryChargeMinor !== order.totalMinor) throw new Error(`Order total does not reconcile: ${order.orderNumber}.`);
    if (order.placedAt >= input.cutover) throw new Error(`Legacy order is at or after cutover: ${order.orderNumber}.`);
    const payment = paymentByOrder.get(order.id); if (!payment) throw new Error(`Order has no payment: ${order.orderNumber}.`);
    const invoice = dataset.invoices.find(value => value.orderId === order.id);
    if (payment.status === "SUCCEEDED" !== Boolean(invoice)) throw new Error(`Payment/invoice relationship is invalid: ${order.orderNumber}.`);
    if (payment.status === "SUCCEEDED" && (!payment.providerReference || payment.provider !== "DEMO_HISTORY_IMPORT" || payment.updatedAt < order.placedAt)) throw new Error(`Successful imported payment is invalid: ${order.orderNumber}.`);
    if (order.status === "DELIVERED" && shipmentByOrder.get(order.id)?.status !== "DELIVERED") throw new Error(`Delivered order has no delivered shipment: ${order.orderNumber}.`);
  }
  for (const item of dataset.orderItems) { const variant = variants.get(item.variantId); if (!variant || item.skuSnapshot !== variant.sku || item.nameSnapshot !== variant.perfumeName || item.unitPriceMinor !== variant.priceMinor || item.quantity < 1) throw new Error("Order item snapshot does not match approved catalogue."); }
  for (const shipment of dataset.shipments) { const events = dataset.trackingEvents.filter(value => value.shipmentId === shipment.id).sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime()); if (events.some((value, index) => index > 0 && value.occurredAt < present(events[index - 1]).occurredAt)) throw new Error("Tracking events are not monotonic."); const last = events.at(-1); if (shipment.status === "DELIVERED" && (!shipment.deliveredAt || last?.status !== "DELIVERED" || shipment.deliveredAt < present(last).occurredAt)) throw new Error("Delivered shipment timeline is invalid."); }
  unique("review customer/perfume pairs", dataset.reviews.map(value => `${value.customerId}:${value.perfumeId}`));
  const qualifying = new Set(dataset.orderItems.filter(item => paymentByOrder.get(item.orderId)?.status === "SUCCEEDED").map(item => `${present(orderById.get(item.orderId)).customerId}:${present(variants.get(item.variantId)).perfumeId}`));
  for (const review of dataset.reviews) { if (!qualifying.has(`${review.customerId}:${review.perfumeId}`)) throw new Error("Review lacks successful purchase."); if ((review.status === "PENDING") !== (review.moderatedAt === null && review.moderatedById === null)) throw new Error("Review moderation state is invalid."); }
  unique("wishlist composite keys", dataset.wishlists.map(value => `${value.customerId}:${value.perfumeId}`));
  if (dataset.cartItems.some(item => variants.get(item.variantId)?.availability !== "AVAILABLE")) throw new Error("Active cart uses unavailable variant.");
}
