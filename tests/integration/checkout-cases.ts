import { describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { ids, seedId } from "../../prisma/seed-data";
import { CheckoutService } from "../../src/modules/commerce/checkout/service";
import type { ApiResult } from "../../src/contracts/common";
function status<T>(result: ApiResult<T>): string { expect(result.ok).toBe(true); return result.ok ? JSON.stringify(result.data) : result.error.code; }
export function checkoutCases(db: PrismaClient): void {
  describe("authoritative checkout boundary", () => {
    const service = new CheckoutService(db, () => new Date("2026-09-08T00:00:00.000Z"));
    it("requires a customer and exposes active delivery methods", async () => { expect(status(await service.getDeliveryMethods())).toContain("Demo delivery"); const invalid = await service.submit("bad", {} as never); expect(invalid.ok).toBe(false); if (!invalid.ok) expect(invalid.error.code).toBe("VALIDATION_ERROR"); });
    it("revalidates, reserves and replays an idempotent checkout request", async () => {
      await db.order.deleteMany({ where: { customerId: ids.otherCustomer } }); await db.cart.deleteMany({ where: { customerId: ids.otherCustomer } }); await db.address.deleteMany({ where: { customerId: ids.otherCustomer } });
      const address = await db.address.create({ data: { id: seedId(950), customerId: ids.otherCustomer, type: "DELIVERY", recipientName: "Other Customer", line1: "2 Example Street", suburb: "Example", state: "VIC", postcode: "3000", country: "AU" } });
      const cart = await db.cart.create({ data: { customerId: ids.otherCustomer } }); await db.cartItem.create({ data: { cartId: cart.id, variantId: ids.variant, quantity: 1 } });
      const input = { cartId: cart.id, expectedCartRevision: "cart-1" as const, deliveryAddressId: address.id, billingAddressId: address.id, deliveryMethodId: ids.delivery, idempotencyKey: "checkout-test-key-950" };
      const first = await service.submit(ids.otherCustomer, input); expect(first.ok && first.data.status).toBe("READY_FOR_PAYMENT"); if (!first.ok || first.data.status !== "READY_FOR_PAYMENT") return;
      expect(await db.inventoryReservation.count({ where: { orderId: first.data.orderId, status: "ACTIVE" } })).toBe(1); const retry = await service.submit(ids.otherCustomer, input); expect(retry.ok && retry.data).toEqual(first.data);
      await db.cart.delete({ where: { id: cart.id } }); await db.address.delete({ where: { id: address.id } });
    });
    it("returns out-of-stock without creating an order", async () => { const cart = await db.cart.create({ data: { customerId: ids.otherCustomer } }); await db.cartItem.create({ data: { cartId: cart.id, variantId: ids.variant, quantity: 999 } }); const address = await db.address.create({ data: { id: seedId(951), customerId: ids.otherCustomer, type: "DELIVERY", recipientName: "Other Customer", line1: "2 Example Street", suburb: "Example", state: "VIC", postcode: "3000", country: "AU" } }); const result = await service.submit(ids.otherCustomer, { cartId: cart.id, expectedCartRevision: "cart-1", deliveryAddressId: address.id, billingAddressId: address.id, deliveryMethodId: ids.delivery, idempotencyKey: "checkout-test-key-951" }); expect(result.ok && result.data.status).toBe("OUT_OF_STOCK"); await db.cart.delete({ where: { id: cart.id } }); await db.address.delete({ where: { id: address.id } }); });
  });
}
