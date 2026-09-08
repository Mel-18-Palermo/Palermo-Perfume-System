import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { ids, seedId } from "../../prisma/seed-data";
import { CheckoutService } from "../../src/modules/commerce/checkout/service";
import type { CheckoutRequest } from "../../src/contracts/checkout";
import type { ApiResult } from "../../src/contracts/common";

const clock = new Date("2026-09-08T00:00:00.000Z");
const addressData = { recipientName: "Other Customer", line1: "2 Example Street", line2: null, suburb: "Example", state: "VIC", postcode: "3000", country: "AU" } as const;

function outcome<T>(result: ApiResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.code);
  return result.data;
}

export function checkoutCases(db: PrismaClient): void {
  describe("authoritative checkout boundary", () => {
    const service = new CheckoutService(db, () => clock);

    async function cleanup(customerIds: readonly string[] = [ids.otherCustomer]): Promise<void> {
      const orders = await db.order.findMany({ where: { customerId: { in: [...customerIds] } }, select: { id: true } });
      const orderIds = orders.map(order => order.id);
      await db.inventoryReservation.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.cart.deleteMany({ where: { customerId: { in: [...customerIds] } } });
      await db.address.deleteMany({ where: { customerId: { in: [...customerIds] } } });
      await db.promotion.deleteMany({ where: { code: { startsWith: "CHECKOUT-" }, orders: { none: {} } } });
      await db.inventoryBalance.update({ where: { variantId: ids.variant }, data: { onHand: 12, reserved: 2 } });
      await db.perfumeVariant.update({ where: { id: ids.variant }, data: { priceMinor: 12000, availability: "AVAILABLE" } });
      await db.deliveryMethod.update({ where: { id: ids.delivery }, data: { active: true, currency: "AUD" } });
    }

    async function setup(customerId = ids.otherCustomer, suffix = 950, promotionId?: string): Promise<{ input: CheckoutRequest; cartId: string }> {
      const address = await db.address.create({ data: { id: seedId(suffix), customerId, type: "DELIVERY", ...addressData } });
      const cart = await db.cart.create({ data: { customerId, promotionId: promotionId ?? null } });
      await db.cartItem.create({ data: { cartId: cart.id, variantId: ids.variant, quantity: 1 } });
      return {
        cartId: cart.id,
        input: {
          cartId: cart.id,
          expectedCartRevision: "cart-1",
          deliveryAddressId: address.id,
          billingAddressId: address.id,
          deliveryMethodId: ids.delivery,
          idempotencyKey: `checkout-test-key-${suffix}`,
        },
      };
    }

    it("requires an active authenticated customer and exposes active delivery methods", async () => {
      expect(outcome(await service.getDeliveryMethods())).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Demo delivery" })]));
      const invalid = await service.submit("bad", {} as never);
      expect(invalid.ok).toBe(false);
      if (!invalid.ok) expect(invalid.error.code).toBe("VALIDATION_ERROR");
      const unauthenticated = await service.submit(seedId(999), {
        cartId: seedId(998), expectedCartRevision: "cart-1", deliveryAddressId: seedId(997),
        billingAddressId: seedId(997), deliveryMethodId: ids.delivery, idempotencyKey: "checkout-unauthenticated",
      });
      expect(unauthenticated.ok).toBe(false);
      if (!unauthenticated.ok) expect(unauthenticated.error.code).toBe("UNAUTHENTICATED");
    });

    it("returns the authenticated customer's authoritative cart for wrong ownership and stale revision", async () => {
      await cleanup();
      const own = await setup();
      const wrong = outcome(await service.submit(ids.otherCustomer, { ...own.input, cartId: ids.cart, idempotencyKey: "checkout-wrong-owner" }));
      expect(wrong.status).toBe("REQUIRES_CART_REVIEW");
      if (wrong.status === "REQUIRES_CART_REVIEW") {
        expect(wrong.cart.id).toBe(own.cartId);
        expect(wrong.cart.items[0]?.unitPrice.amountMinor).toBe(12000);
        expect(wrong.cart.pricing.total.amountMinor).toBe(12000);
      }
      const stale = outcome(await service.submit(ids.otherCustomer, { ...own.input, expectedCartRevision: "cart-99", idempotencyKey: "checkout-stale-cart" }));
      expect(stale.status).toBe("REQUIRES_CART_REVIEW");
      if (stale.status === "REQUIRES_CART_REVIEW") expect(stale.cart.id).toBe(own.cartId);
      await cleanup();
    });

    it("snapshots current server pricing and never accepts a browser price", async () => {
      await cleanup();
      const { input } = await setup(ids.otherCustomer, 951);
      await db.perfumeVariant.update({ where: { id: ids.variant }, data: { priceMinor: 13500 } });
      const result = outcome(await service.submit(ids.otherCustomer, input));
      expect(result.status).toBe("READY_FOR_PAYMENT");
      if (result.status === "READY_FOR_PAYMENT") {
        const order = await db.order.findUniqueOrThrow({ where: { id: result.orderId }, include: { items: true } });
        expect(order.items[0]?.unitPriceMinor).toBe(13500);
        expect(order.subtotalMinor).toBe(13500);
      }
      await cleanup();
    });

    it("rejects inactive, expired and unsupported promotion eligibility without residue", async () => {
      for (const [suffix, promotion] of [
        [952, { active: false, eligibility: {} }],
        [953, { active: true, activeUntil: new Date("2026-09-07T23:59:59.000Z"), eligibility: {} }],
        [954, { active: true, eligibility: { unsupportedRule: true } }],
      ] as const) {
        await cleanup();
        const created = await db.promotion.create({ data: { code: `CHECKOUT-${suffix}`, discountType: "FIXED", discountValue: 1000, currency: "AUD", ...promotion } });
        const { input } = await setup(ids.otherCustomer, suffix, created.id);
        const result = outcome(await service.submit(ids.otherCustomer, { ...input, promotionCode: created.code }));
        expect(result.status).toBe("INVALID_PROMOTION");
        expect(await db.order.count({ where: { customerId: ids.otherCustomer, idempotencyKey: input.idempotencyKey } })).toBe(0);
        expect(await db.inventoryReservation.count({ where: { order: { customerId: ids.otherCustomer } } })).toBe(0);
      }
      await cleanup();
    });

    it("revalidates and snapshots an active universally eligible promotion", async () => {
      await cleanup();
      const promotion = await db.promotion.create({ data: { code: "CHECKOUT-ELIGIBLE", discountType: "FIXED", discountValue: 1000, currency: "AUD", active: true, activeFrom: new Date("2026-09-07T00:00:00.000Z"), activeUntil: new Date("2026-09-09T00:00:00.000Z"), eligibility: {} } });
      const { input } = await setup(ids.otherCustomer, 961, promotion.id);
      const result = outcome(await service.submit(ids.otherCustomer, { ...input, promotionCode: promotion.code }));
      expect(result.status).toBe("READY_FOR_PAYMENT");
      if (result.status === "READY_FOR_PAYMENT") {
        const order = await db.order.findUniqueOrThrow({ where: { id: result.orderId } });
        expect(order.discountTotalMinor).toBe(1000);
        expect(order.totalMinor).toBe(12000);
      }
      await cleanup();
    });

    it("rejects invalid address and delivery method without partial commerce state", async () => {
      await cleanup();
      const { input, cartId } = await setup(ids.otherCustomer, 955);
      const badAddress = outcome(await service.submit(ids.otherCustomer, { ...input, deliveryAddressId: ids.address }));
      expect(badAddress.status).toBe("CHECKOUT_CONFLICT");
      const badMethod = outcome(await service.submit(ids.otherCustomer, { ...input, deliveryMethodId: seedId(999), idempotencyKey: "checkout-bad-method" }));
      expect(badMethod.status).toBe("CHECKOUT_CONFLICT");
      expect(await db.order.count({ where: { customerId: ids.otherCustomer, idempotencyKey: { in: [input.idempotencyKey, "checkout-bad-method"] } } })).toBe(0);
      expect(await db.payment.count({ where: { order: { customerId: ids.otherCustomer } } })).toBe(0);
      expect(await db.inventoryReservation.count({ where: { order: { customerId: ids.otherCustomer } } })).toBe(0);
      expect((await db.cart.findUniqueOrThrow({ where: { id: cartId } })).status).toBe("ACTIVE");
      await cleanup();
    });

    it("returns out of stock and atomically rolls back order, payment, reservation and cart claim", async () => {
      await cleanup();
      const { input, cartId } = await setup(ids.otherCustomer, 956);
      await db.inventoryBalance.update({ where: { variantId: ids.variant }, data: { onHand: 2, reserved: 2 } });
      const result = outcome(await service.submit(ids.otherCustomer, input));
      expect(result.status).toBe("OUT_OF_STOCK");
      expect(await db.order.count({ where: { customerId: ids.otherCustomer, idempotencyKey: input.idempotencyKey } })).toBe(0);
      expect(await db.payment.count({ where: { order: { customerId: ids.otherCustomer } } })).toBe(0);
      expect(await db.inventoryReservation.count({ where: { order: { customerId: ids.otherCustomer } } })).toBe(0);
      expect(await db.cart.findUnique({ where: { id: cartId } })).toMatchObject({ status: "ACTIVE", revision: 1 });
      await cleanup();
    });

    it("creates one short reservation and replays its original persisted expiry", async () => {
      await cleanup();
      let now = clock;
      const replayService = new CheckoutService(db, () => now);
      const { input } = await setup(ids.otherCustomer, 957);
      const first = outcome(await replayService.submit(ids.otherCustomer, input));
      expect(first.status).toBe("READY_FOR_PAYMENT");
      if (first.status !== "READY_FOR_PAYMENT") return;
      const reservation = await db.inventoryReservation.findFirstOrThrow({ where: { orderId: first.orderId } });
      expect(first.expiresAt).toBe(reservation.expiresAt.toISOString());
      const originalExpiry = reservation.expiresAt;
      now = new Date(clock.getTime() + 10 * 60 * 1000);
      const retry = outcome(await replayService.submit(ids.otherCustomer, input));
      expect(retry).toEqual(first);
      expect((await db.inventoryReservation.findUniqueOrThrow({ where: { id: reservation.id } })).expiresAt).toEqual(originalExpiry);
      const conflict = outcome(await replayService.submit(ids.otherCustomer, { ...input, promotionCode: "DIFFERENT" }));
      expect(conflict.status).toBe("CHECKOUT_CONFLICT");
      expect(await db.order.count({ where: { customerId: ids.otherCustomer, idempotencyKey: input.idempotencyKey } })).toBe(1);
      expect(await db.inventoryReservation.count({ where: { orderId: first.orderId } })).toBe(1);
      await cleanup();
    });

    it("returns one authoritative result for simultaneous identical retries", async () => {
      await cleanup();
      const { input } = await setup(ids.otherCustomer, 958);
      const results = await Promise.all([service.submit(ids.otherCustomer, input), service.submit(ids.otherCustomer, input)]);
      const values = results.map(outcome);
      expect(values.every(result => result.status === "READY_FOR_PAYMENT")).toBe(true);
      expect(values[0]).toEqual(values[1]);
      expect(await db.order.count({ where: { customerId: ids.otherCustomer, idempotencyKey: input.idempotencyKey } })).toBe(1);
      expect(await db.inventoryReservation.count({ where: { order: { customerId: ids.otherCustomer } } })).toBe(1);
      await cleanup();
    });

    it("prevents oversell under simultaneous checkout contention", async () => {
      const customerIds = [randomUUID(), randomUUID()] as const;
      await cleanup(customerIds);
      for (const [index, customerId] of customerIds.entries()) {
        await db.customer.create({ data: { id: customerId, email: `checkout-race-${index}@example.test`, name: `Checkout race ${index}`, status: "ACTIVE", emailVerifiedAt: clock } });
      }
      await db.inventoryBalance.update({ where: { variantId: ids.variant }, data: { onHand: 10, reserved: 0 } });
      const first = await setup(customerIds[0], 959);
      const second = await setup(customerIds[1], 960);
      await db.cartItem.updateMany({ where: { cartId: { in: [first.cartId, second.cartId] } }, data: { quantity: 6 } });
      const results = await Promise.all([service.submit(customerIds[0], first.input), service.submit(customerIds[1], second.input)]);
      const values = results.map(outcome);
      expect(values.filter(result => result.status === "READY_FOR_PAYMENT")).toHaveLength(1);
      expect(values.filter(result => result.status === "OUT_OF_STOCK")).toHaveLength(1);
      const balance = await db.inventoryBalance.findUniqueOrThrow({ where: { variantId: ids.variant } });
      expect(balance.reserved).toBe(6);
      expect(balance.reserved).toBeLessThanOrEqual(balance.onHand);
      await cleanup(customerIds);
    });
  });
}
