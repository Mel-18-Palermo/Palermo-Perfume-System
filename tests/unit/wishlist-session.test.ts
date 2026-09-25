import { describe, expect, it } from "vitest";
import type { Session } from "../../src/contracts/auth";
import { canLoadWishlist } from "../../src/app/wishlist/_components/wishlist-session";

const customer: Session = {
  user: { id: "customer", role: "CUSTOMER", email: "customer@example.test", displayName: "Customer" },
};
const admin: Session = {
  user: { id: "admin", role: "ADMIN", email: "admin@example.test", displayName: "Admin" },
};

describe("wishlist session boundary", () => {
  it("waits for session resolution before loading account data", () => {
    expect(canLoadWishlist(customer, false)).toBe(false);
    expect(canLoadWishlist(null, false)).toBe(false);
  });

  it("loads only for an authenticated customer", () => {
    expect(canLoadWishlist(customer, true)).toBe(true);
    expect(canLoadWishlist({ user: null }, true)).toBe(false);
    expect(canLoadWishlist(admin, true)).toBe(false);
  });
});
