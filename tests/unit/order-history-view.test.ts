import { describe, expect, it } from "vitest";
import { canLoadOrderHistory } from "../../src/app/orders/_components/order-history-session";
import type { Session } from "../../src/contracts/auth";

const customerSession: Session = {
  user: { id: "customer-1", role: "CUSTOMER", email: "customer@example.test", displayName: "Customer" },
};

describe("order history session hydration", () => {
  it("does not request orders before customer session hydration resolves", () => {
    expect(canLoadOrderHistory(null, false)).toBe(false);
    expect(canLoadOrderHistory(customerSession, false)).toBe(false);
  });

  it("requests orders only after an authenticated session resolves", () => {
    expect(canLoadOrderHistory(null, true)).toBe(false);
    expect(canLoadOrderHistory({ user: null }, true)).toBe(false);
    expect(canLoadOrderHistory(customerSession, true)).toBe(true);
  });
});
