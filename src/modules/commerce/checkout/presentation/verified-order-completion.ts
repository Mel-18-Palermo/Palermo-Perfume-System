import type { OrderDetail } from "@/contracts/orders";

const confirmedOrderStatuses: ReadonlySet<OrderDetail["status"]> = new Set([
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
]);

/**
 * Presentation may acknowledge completion only after the authoritative order
 * read has both a successful payment and a confirmed fulfilment state.
 */
export function isVerifiedOrderCompletion(order: Pick<OrderDetail, "paymentStatus" | "status">): boolean {
  return order.paymentStatus === "SUCCEEDED" && confirmedOrderStatuses.has(order.status);
}

export function orderConfirmationHref(orderId: string): string {
  return `/orders/${encodeURIComponent(orderId)}?confirmed=1`;
}
