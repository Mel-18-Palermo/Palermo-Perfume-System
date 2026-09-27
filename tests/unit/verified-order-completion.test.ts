import { describe, expect, it } from "vitest";
import { order } from "../../src/lib/api/mocks/fixtures";
import {
  isVerifiedOrderCompletion,
  orderConfirmationHref,
} from "../../src/modules/commerce/checkout/presentation/verified-order-completion";

describe("verified checkout completion presentation", () => {
  it("redirects only after the authoritative order is paid and confirmed", () => {
    expect(isVerifiedOrderCompletion(order)).toBe(true);
    expect(isVerifiedOrderCompletion({ ...order, paymentStatus: "PENDING" })).toBe(false);
    expect(isVerifiedOrderCompletion({ ...order, status: "PLACED" })).toBe(false);
  });

  it("uses the existing order detail route for the confirmation presentation", () => {
    expect(orderConfirmationHref("order/with a space")).toBe("/orders/order%2Fwith%20a%20space?confirmed=1");
  });
});
