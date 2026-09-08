import type { Endpoint, EntityId, MoneyValue, Revision, Timestamp } from "./common";
import type { CartDto } from "./cart";

export type DeliveryMethod = Readonly<{
  id: EntityId; name: string; charge: MoneyValue; displayInformation: string | null;
}>;
export type CheckoutRequest = Readonly<{
  cartId: EntityId; expectedCartRevision: Revision; deliveryAddressId: EntityId;
  billingAddressId: EntityId; deliveryMethodId: EntityId; promotionCode?: string;
  /** Reuse on retry of an identical request; use a new key after changing its contents. */
  idempotencyKey: string;
}>;
/** Opaque application payment attempt: UI must not infer an order's paid state from this. */
export type CheckoutResult =
  | Readonly<{
      status: "READY_FOR_PAYMENT";
      orderId: EntityId;
      paymentAttemptId: EntityId;
      /** Current authoritative reservation deadline. Identical checkout replay does not extend it. */
      expiresAt: Timestamp;
    }>
  | Readonly<{ status: "REQUIRES_CART_REVIEW"; cart: CartDto }>
  | Readonly<{ status: "OUT_OF_STOCK"; variantIds: readonly EntityId[] }>
  | Readonly<{ status: "INVALID_PROMOTION"; message: string }>
  | Readonly<{ status: "CHECKOUT_CONFLICT"; message: string }>;
export type CheckoutApi = Readonly<{
  getDeliveryMethods: Endpoint<void, readonly DeliveryMethod[]>;
  submit: Endpoint<CheckoutRequest, CheckoutResult>;
}>;
