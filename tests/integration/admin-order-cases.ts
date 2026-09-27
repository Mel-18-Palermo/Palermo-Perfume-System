import { describe, expect, it } from "vitest";
import { ids } from "../../prisma/seed-data";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { AdminOrdersService } from "../../src/modules/administration/orders-service";

function data<T>(result: { ok: true; data: T } | { ok: false; error: unknown }): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected an administrator order result");
  return result.data;
}

export function adminOrderCases(db: PrismaClient): void {
  describe("administrator order read service", () => {
    const service = new AdminOrdersService(db);

    it("lists truthful order, payment and shipment states without customer ownership filtering", async () => {
      const result = data(await service.list({ page: 1, pageSize: 20 }));
      const paid = result.items.find(item => item.id === ids.paidOrder);
      const pending = result.items.find(item => item.id === ids.pendingOrder);

      expect(paid).toMatchObject({
        customer: { name: "Demo Customer", email: "customer@example.test" },
        paymentStatus: "SUCCEEDED",
        shipmentState: "PENDING",
        trackingPresent: true,
      });
      expect(pending).toMatchObject({
        paymentStatus: "PENDING",
        shipmentState: "NOT_CREATED",
        trackingPresent: false,
      });
      for (const request of [{ page: 0, pageSize: 20 }, { page: 1, pageSize: 0 }, { page: 1, pageSize: 51 }]) {
        const invalid = await service.list(request);
        expect(invalid).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
      }
    });

    it("returns immutable operational snapshots, payment reference and tracking events without writing", async () => {
      const before = {
        orders: await db.order.count(),
        payments: await db.payment.count(),
        shipments: await db.shipment.count(),
        events: await db.trackingEvent.count(),
      };
      const detail = data(await service.get(ids.paidOrder));

      expect(detail).toMatchObject({
        id: ids.paidOrder,
        paymentReference: "demo-verified-payment",
        deliveryAddress: { line1: "1 Example Street" },
        items: [{ sku: "DEMO-CITRUS-50", title: "Demo Citrus", quantity: 2, lineTotal: { amountMinor: 24000, currency: "AUD" } }],
        shipment: { trackingReference: "DEMO-TRACK-001", events: [{ description: "Awaiting simulated dispatch." }] },
      });
      expect(detail).not.toHaveProperty("billingAddress");
      expect(await db.order.count()).toBe(before.orders);
      expect(await db.payment.count()).toBe(before.payments);
      expect(await db.shipment.count()).toBe(before.shipments);
      expect(await db.trackingEvent.count()).toBe(before.events);
    });

    it("does not disclose a nonexistent order", async () => {
      expect(await service.get("24200000-0000-4000-8000-000000000999")).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    });
  });
}
