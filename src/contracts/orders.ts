import type { Endpoint, EntityId, MoneyValue, Page, PageRequest, Timestamp } from "./common";
import type { AddressInput } from "./profile";
import type { CartCustomisation } from "./cart";
import type { DeliveryMethod } from "./checkout";

/** Presentation state names selected in #241, independent of payment and cancellation requests. */
export type OrderStatus = "PLACED" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "EXPIRED";
export type OrderSummary = Readonly<{
  id: EntityId; orderNumber: string; placedAt: Timestamp; status: OrderStatus;
  paymentStatus: PaymentStatus; total: MoneyValue;
}>;
export type OrderItem = Readonly<{
  id: EntityId; variantId: EntityId; sku: string; title: string; quantity: number;
  unitPrice: MoneyValue; customisation: CartCustomisation;
}>;
export type CancellationRequest = Readonly<{ requestedAt: Timestamp }>;
export type OrderDetail = OrderSummary & Readonly<{
  items: readonly OrderItem[]; subtotal: MoneyValue; discountTotal: MoneyValue;
  deliveryAddress: AddressInput; billingAddress: AddressInput; deliveryMethod: DeliveryMethod;
  invoiceId: EntityId | null; shipmentId: EntityId | null;
  canRequestCancellation: boolean; cancellationRequest: CancellationRequest | null;
}>;
export type Invoice = Readonly<{
  id: EntityId; invoiceNumber: string; issuedAt: Timestamp; order: OrderDetail;
  paymentReference: string;
}>;
export type OrdersApi = Readonly<{
  list: Endpoint<PageRequest, Page<OrderSummary>>;
  get: Endpoint<{ readonly id: EntityId }, OrderDetail>;
  getInvoice: Endpoint<{ readonly orderId: EntityId }, Invoice>;
  requestCancellation: Endpoint<{
    readonly orderId: EntityId; readonly idempotencyKey: string;
  }, CancellationRequest>;
}>;
