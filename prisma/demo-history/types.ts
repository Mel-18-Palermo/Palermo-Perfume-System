export const historyProfile = "presentation-v1" as const;
export const historyNamespace = "palermo-demo-history:presentation-v1" as const;

export type CatalogueVariant = Readonly<{
  id: string; perfumeId: string; perfumeName: string; sku: string; priceMinor: number;
  currency: string; availability: "AVAILABLE" | "OUT_OF_STOCK" | "UNAVAILABLE";
}>;

export type HistoryInput = Readonly<{ profile: typeof historyProfile; seed: number; asOf: Date; cutover: Date; variants: readonly CatalogueVariant[]; moderatorId: string; delivery: Readonly<{ id: string; name: string; chargeMinor: number; currency: string }> }>;
export type HistoryAddress = Readonly<{ id: string; customerId: string; type: "DELIVERY" | "BILLING"; recipientName: string; line1: string; line2: string | null; suburb: string; state: string; postcode: string; country: string; updatedAt: Date }>;
export type HistoryCustomer = Readonly<{ id: string; name: string; email: string; status: "ACTIVE"; authUserId: null; emailVerifiedAt: Date; createdAt: Date; billingSameAsDelivery: boolean }>;
export type HistoryOrder = Readonly<{ id: string; customerId: string; orderNumber: string; idempotencyKey: string; requestFingerprint: string; deliveryMethodId: string; status: "PLACED" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED"; subtotalMinor: number; discountTotalMinor: number; deliveryChargeMinor: number; totalMinor: number; currency: string; deliveryAddressSnapshot: object; billingAddressSnapshot: object; deliveryMethodSnapshot: object; placedAt: Date; cancellationRequestedAt: Date | null; cancellationIdempotencyKey: string | null }>;
export type HistoryOrderItem = Readonly<{ id: string; orderId: string; variantId: string; skuSnapshot: string; nameSnapshot: string; unitPriceMinor: number; quantity: number; personalisedLabel: null; engravingName: null; giftMessage: null; giftPackagingId: null }>;
export type HistoryPayment = Readonly<{ id: string; orderId: string; status: "PENDING" | "SUCCEEDED" | "FAILED" | "EXPIRED"; provider: "DEMO_HISTORY_IMPORT"; providerReference: string | null; attemptSequence: number; lastProviderEventId: string | null; updatedAt: Date }>;
export type HistoryInvoice = Readonly<{ id: string; orderId: string; invoiceNumber: string; totalMinor: number; currency: string; paymentReferenceSnapshot: string; issuedAt: Date }>;
export type HistoryShipment = Readonly<{ id: string; orderId: string; trackingReference: string | null; status: "PENDING" | "DISPATCHED" | "IN_TRANSIT" | "DELIVERED"; confirmationSource: string | null; deliveredAt: Date | null; updatedAt: Date }>;
export type HistoryTrackingEvent = Readonly<{ id: string; shipmentId: string; status: "PENDING" | "DISPATCHED" | "IN_TRANSIT" | "DELIVERED"; description: string; occurredAt: Date }>;
export type HistoryReview = Readonly<{ id: string; customerId: string; perfumeId: string; rating: number; text: string; status: "APPROVED" | "PENDING" | "HIDDEN"; moderatedById: string | null; moderatedAt: Date | null; createdAt: Date; updatedAt: Date }>;
export type HistoryWishlist = Readonly<{ customerId: string; perfumeId: string; createdAt: Date }>;
export type HistoryCart = Readonly<{ id: string; customerId: string; status: "ACTIVE"; revision: number; updatedAt: Date }>;
export type HistoryCartItem = Readonly<{ id: string; cartId: string; variantId: string; quantity: number; personalisedLabel: null; engravingName: null; giftMessage: null; giftPackagingId: null }>;

export type HistoryDataset = Readonly<{ customers: readonly HistoryCustomer[]; addresses: readonly HistoryAddress[]; orders: readonly HistoryOrder[]; orderItems: readonly HistoryOrderItem[]; payments: readonly HistoryPayment[]; invoices: readonly HistoryInvoice[]; shipments: readonly HistoryShipment[]; trackingEvents: readonly HistoryTrackingEvent[]; reviews: readonly HistoryReview[]; wishlists: readonly HistoryWishlist[]; carts: readonly HistoryCart[]; cartItems: readonly HistoryCartItem[] }>;
