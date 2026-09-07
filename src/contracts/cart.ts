import type { Endpoint, EntityId, MoneyValue, Revision } from "./common";

export type CartCustomisation = Readonly<{
  personalisedLabel: string | null; engravingName: string | null;
  giftMessage: string | null; giftPackagingId: EntityId | null;
}>;
export type CartValidationMessage = Readonly<{
  code: "AUTHENTICATION_REQUIRED" | "PRICE_CHANGED" | "UNAVAILABLE" | "INSUFFICIENT_STOCK" | "INVALID_CUSTOMISATION" | "INVALID_PROMOTION";
  itemId: EntityId | null; message: string;
}>;
export type CartItemDto = Readonly<{
  id: EntityId; perfumeId: EntityId; variantId: EntityId; title: string;
  bottleSize: string; concentration: string; quantity: number;
  unitPrice: MoneyValue; itemTotal: MoneyValue; customisation: CartCustomisation;
}>;
/** Display-only, server supplied. Delivery is quoted separately at checkout. */
export type CartPricingDto = Readonly<{
  subtotal: MoneyValue; discountTotal: MoneyValue; total: MoneyValue;
}>;
export type CartDto = Readonly<{
  id: EntityId; revision: Revision; kind: "VISITOR" | "CUSTOMER"; items: readonly CartItemDto[];
  pricing: CartPricingDto; promotionCode: string | null;
  checkoutEligible: boolean; validationMessages: readonly CartValidationMessage[];
}>;
export type CartMutation = Readonly<{ cartId: EntityId; expectedRevision: Revision }>;
export type CartApi = Readonly<{
  get: Endpoint<void, CartDto>;
  addItem: Endpoint<CartMutation & {
    readonly variantId: EntityId; readonly quantity: number; readonly customisation: CartCustomisation;
  }, CartDto>;
  updateQuantity: Endpoint<CartMutation & { readonly itemId: EntityId; readonly quantity: number }, CartDto>;
  removeItem: Endpoint<CartMutation & { readonly itemId: EntityId }, CartDto>;
  applyPromotion: Endpoint<CartMutation & { readonly code: string | null }, CartDto>;
}>;
