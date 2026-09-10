import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ids } from "../../prisma/seed-data";
import type { OrderStatus, PrismaClient } from "../../src/lib/db/generated/client";
import { OrdersService } from "../../src/modules/commerce/orders/service";

const clock = new Date("2026-09-09T00:00:00.000Z");
const snapshot = {
  recipientName: "Order Test",
  line1: "1 Snapshot Street",
  line2: null,
  suburb: "Melbourne",
  state: "VIC",
  postcode: "3000",
  country: "AU",
};

function data<T>(result: { ok: true; data: T } | { ok: false; error: unknown }): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected successful order result");
  return result.data;
}

export function orderCases(db: PrismaClient): void {
  describe("customer order history authority", () => {
    const service = new OrdersService(db, () => clock);

    async function order(status: OrderStatus, customerId = ids.otherCustomer): Promise<string> {
      const token = randomUUID();
      return db.order.create({
        data: {
          customerId,
          orderNumber: `ORDER-${token}`,
          idempotencyKey: `order:${token}`,
          requestFingerprint: `fingerprint:${token}`,
          deliveryMethodId: ids.delivery,
          status,
          subtotalMinor: 12000,
          discountTotalMinor: 0,
          deliveryChargeMinor: 1000,
          totalMinor: 13000,
          currency: "AUD",
          deliveryAddressSnapshot: snapshot,
          billingAddressSnapshot: snapshot,
          deliveryMethodSnapshot: {
            id: ids.delivery,
            name: "Snapshot delivery",
            chargeMinor: 1000,
            currency: "AUD",
            displayInformation: "Snapshot delivery terms",
          },
        },
        select: { id: true },
      }).then(value => value.id);
    }

    it("scopes list/detail/invoice reads to the customer and validates pagination", async () => {
      const list = data(await service.list(ids.customer, { page: 1, pageSize: 10 }));
      expect(list.items.some(item => item.id === ids.paidOrder)).toBe(true);
      const otherList = data(await service.list(ids.otherCustomer, { page: 1, pageSize: 50 }));
      expect(otherList.items.some(item => item.id === ids.paidOrder)).toBe(false);
      for (const request of [{ page: 0, pageSize: 10 }, { page: 1, pageSize: 0 }, { page: 1, pageSize: 51 }]) {
        const invalid = await service.list(ids.customer, request);
        expect(invalid.ok).toBe(false);
        if (!invalid.ok) expect(invalid.error.code).toBe("VALIDATION_ERROR");
      }
      const wrongOwner = await service.get(ids.otherCustomer, ids.paidOrder);
      expect(wrongOwner.ok).toBe(false);
      if (!wrongOwner.ok) expect(wrongOwner.error.code).toBe("NOT_FOUND");
      const wrongInvoiceOwner = await service.invoice(ids.otherCustomer, ids.paidOrder);
      expect(wrongInvoiceOwner.ok).toBe(false);
      if (!wrongInvoiceOwner.ok) expect(wrongInvoiceOwner.error.code).toBe("NOT_FOUND");
      const unauthenticated = await service.list("invalid", {});
      expect(unauthenticated.ok).toBe(false);
      if (!unauthenticated.ok) expect(unauthenticated.error.code).toBe("UNAUTHENTICATED");
    });

    it("renders immutable order snapshots instead of current catalogue or delivery data", async () => {
      const original = await db.deliveryMethod.findUniqueOrThrow({ where: { id: ids.delivery } });
      await db.deliveryMethod.update({
        where: { id: ids.delivery },
        data: { name: "Changed delivery", chargeMinor: 9999, displayInformation: "Changed terms" },
      });
      try {
        const detail = data(await service.get(ids.customer, ids.paidOrder));
        expect(detail.items[0]).toMatchObject({ sku: "DEMO-CITRUS-50", title: "Demo Citrus", unitPrice: { amountMinor: 12000, currency: "AUD" } });
        expect(detail.deliveryAddress.line1).toBe("1 Example Street");
        expect(detail.deliveryMethod).toMatchObject({
          id: ids.delivery,
          name: "Demo delivery",
          charge: { amountMinor: 1000, currency: "AUD" },
          displayInformation: null,
        });
      } finally {
        await db.deliveryMethod.update({
          where: { id: ids.delivery },
          data: {
            name: original.name,
            chargeMinor: original.chargeMinor,
            displayInformation: original.displayInformation,
          },
        });
      }
    });

    it("keeps invoice GET read-only and exposes only the transactionally created invoice", async () => {
      const before = await db.invoice.count();
      const pending = await service.invoice(ids.customer, ids.pendingOrder);
      expect(pending.ok).toBe(false);
      if (!pending.ok) expect(pending.error.code).toBe("CONFLICT");
      expect(await db.invoice.count()).toBe(before);

      const paid = data(await service.invoice(ids.customer, ids.paidOrder));
      expect(paid).toMatchObject({ paymentReference: "demo-verified-payment", order: { id: ids.paidOrder } });
      expect(data(await service.invoice(ids.customer, ids.paidOrder))).toEqual(paid);
      expect(await db.invoice.count()).toBe(before);

      const missingInvoiceOrder = await order("CONFIRMED");
      await db.payment.create({
        data: {
          orderId: missingInvoiceOrder,
          status: "SUCCEEDED",
          providerReference: `pi_test_${randomUUID()}`,
        },
      });
      const inconsistent = await service.invoice(ids.otherCustomer, missingInvoiceOrder);
      expect(inconsistent.ok).toBe(false);
      if (!inconsistent.ok) expect(inconsistent.error.code).toBe("TEMPORARILY_UNAVAILABLE");
      expect(await db.invoice.count({ where: { orderId: missingInvoiceOrder } })).toBe(0);
    });

    it("allows every approved pre-shipment cancellation state and denies shipped states", async () => {
      for (const status of ["PLACED", "CONFIRMED", "PROCESSING"] as const) {
        const orderId = await order(status);
        const key = `cancel-${status.toLowerCase()}-${randomUUID()}`;
        const result = data(await service.cancel(ids.otherCustomer, orderId, key));
        expect(result.requestedAt).toBe(clock.toISOString());
        const persisted = await db.order.findUniqueOrThrow({ where: { id: orderId } });
        expect(persisted).toMatchObject({ status, cancellationIdempotencyKey: key, cancellationRequestedAt: clock });
        expect(data(await service.cancel(ids.otherCustomer, orderId, key))).toEqual(result);
        expect(data(await service.get(ids.otherCustomer, orderId))).toMatchObject({
          status,
          canRequestCancellation: false,
          cancellationRequest: result,
        });
      }
      for (const status of ["SHIPPED", "DELIVERED"] as const) {
        const orderId = await order(status);
        const denied = await service.cancel(ids.otherCustomer, orderId, `cancel-${status.toLowerCase()}-${randomUUID()}`);
        expect(denied.ok).toBe(false);
        if (!denied.ok) expect(denied.error.code).toBe("CONFLICT");
        expect(await db.order.findUniqueOrThrow({ where: { id: orderId } })).toMatchObject({ cancellationRequestedAt: null });
      }
    });

    it("atomically records one cancellation request and rejects ownership/key misuse", async () => {
      const orderId = await order("PROCESSING");
      const keys = [`cancel-race-${randomUUID()}`, `cancel-race-${randomUUID()}`] as const;
      const results = await Promise.all(keys.map(key => service.cancel(ids.otherCustomer, orderId, key)));
      expect(results.every(result => result.ok)).toBe(true);
      const outcomes = results.map(data);
      expect(outcomes[0]).toEqual(outcomes[1]);
      const persisted = await db.order.findUniqueOrThrow({ where: { id: orderId } });
      expect(keys).toContain(persisted.cancellationIdempotencyKey);

      const wrongOwnerId = await order("PLACED");
      const wrongOwner = await service.cancel(ids.customer, wrongOwnerId, `cancel-owner-${randomUUID()}`);
      expect(wrongOwner.ok).toBe(false);
      if (!wrongOwner.ok) expect(wrongOwner.error.code).toBe("NOT_FOUND");
      const unknown = await service.cancel(ids.otherCustomer, randomUUID(), `cancel-unknown-${randomUUID()}`);
      expect(unknown.ok).toBe(false);
      if (!unknown.ok) expect(unknown.error.code).toBe("NOT_FOUND");

      const anotherOrder = await order("PLACED");
      const reused = await service.cancel(ids.otherCustomer, anotherOrder, persisted.cancellationIdempotencyKey ?? "");
      expect(reused.ok).toBe(false);
      if (!reused.ok) expect(reused.error.code).toBe("CONFLICT");
    });
  });
}
