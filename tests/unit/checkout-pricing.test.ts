import { describe, expect, it } from "vitest";
import { checkoutTotalMinor } from "../../src/modules/commerce/checkout/pricing";

describe("checkout payable pricing", () => {
  it("adds delivery to the subtotal", () => {
    expect(checkoutTotalMinor(7_000, 0, 1_000)).toBe(8_000);
  });

  it("subtracts a promotion before adding delivery", () => {
    expect(checkoutTotalMinor(7_000, 700, 1_000)).toBe(7_300);
  });

  it("preserves cart-only pricing when no delivery charge applies", () => {
    expect(checkoutTotalMinor(7_000, 700, 0)).toBe(6_300);
  });
});
