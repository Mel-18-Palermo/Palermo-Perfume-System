import type { DiscountType } from "../../lib/db/generated/client";

export type AppliedPromotion = Readonly<{
  active: boolean;
  activeFrom: Date | null;
  activeUntil: Date | null;
  currency: string | null;
  eligibility: unknown;
  discountType: DiscountType;
  discountValue: number;
}>;

/** The promotion rules understood by the customer checkout boundary. */
export function isPromotionEligible(promotion: AppliedPromotion, currency: string, now: Date): boolean {
  if (!promotion.active || (promotion.activeFrom && promotion.activeFrom > now) || (promotion.activeUntil && promotion.activeUntil <= now)) return false;
  if (promotion.currency !== null && promotion.currency !== currency) return false;
  // No non-empty eligibility rule has a canonical schema yet. Unknown rules fail closed.
  return typeof promotion.eligibility === "object" && promotion.eligibility !== null && !Array.isArray(promotion.eligibility) && Object.keys(promotion.eligibility).length === 0;
}

export function promotionDiscount(promotion: AppliedPromotion | null, subtotal: number, currency: string, now: Date): number {
  if (!promotion || !isPromotionEligible(promotion, currency, now)) return 0;
  return promotion.discountType === "FIXED"
    ? Math.min(subtotal, promotion.discountValue)
    : Math.min(subtotal, Math.floor(subtotal * promotion.discountValue / 10_000));
}
