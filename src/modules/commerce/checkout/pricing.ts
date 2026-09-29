/**
 * Checkout's payable amount. Inputs and output are integer minor currency units.
 * Cart pricing intentionally excludes delivery until a delivery method is chosen.
 */
export function checkoutTotalMinor(
  subtotalMinor: number,
  promotionDiscountMinor: number,
  deliveryChargeMinor: number,
): number {
  return subtotalMinor - promotionDiscountMinor + deliveryChargeMinor;
}
