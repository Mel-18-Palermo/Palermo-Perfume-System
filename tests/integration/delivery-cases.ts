import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { DeliveryService, type DeliveryActor } from "../../src/modules/delivery/service";
import { ids } from "../../prisma/seed-data";

const admin: DeliveryActor = { kind: "ADMIN", adminId: ids.admin, permissions: ["delivery:manage"] };
const owner: DeliveryActor = { kind: "CUSTOMER", customerId: ids.customer };
const other: DeliveryActor = { kind: "CUSTOMER", customerId: ids.otherCustomer };

export function deliveryCases(db: PrismaClient): void {
  describe("internal delivery simulator authority", () => {
    const service = new DeliveryService(db, undefined, () => new Date("2026-09-08T00:00:00.000Z"));
    async function order(paymentStatus: "SUCCEEDED" | "PENDING" = "SUCCEEDED"): Promise<string> {
      const id = randomUUID();
      await db.order.create({ data: {
        id, customerId: ids.customer, orderNumber: `DELIVERY-${id.slice(0, 8)}`, idempotencyKey: `delivery-${id}`,
        requestFingerprint: `delivery-${id}`, deliveryMethodId: ids.delivery, status: "CONFIRMED", subtotalMinor: 1000,
        discountTotalMinor: 0, deliveryChargeMinor: 0, totalMinor: 1000, currency: "AUD",
        deliveryAddressSnapshot: {}, billingAddressSnapshot: {}, deliveryMethodSnapshot: { id: ids.delivery, name: "Demo delivery", chargeMinor: 0, currency: "AUD" },
        payment: { create: { status: paymentStatus, providerReference: paymentStatus === "SUCCEEDED" ? `delivery-payment-${id}` : null } },
      } });
      return id;
    }
    async function cleanup(orderId: string): Promise<void> {
      await db.trackingEvent.deleteMany({ where: { shipment: { orderId } } });
      await db.shipment.deleteMany({ where: { orderId } });
      await db.payment.deleteMany({ where: { orderId } });
      await db.order.delete({ where: { id: orderId } });
    }

    it("creates one deterministic shipment and preserves the delivery snapshot", async () => {
      const orderId = await order();
      try {
        const first = await service.create(admin, orderId);
        expect(first).toMatchObject({ ok: true, data: { orderId, status: "PENDING", trackingReference: `PALERMO-${orderId.replaceAll("-", "").slice(0, 16).toUpperCase()}`, events: [{ status: "PENDING" }] } });
        expect(await service.create(admin, orderId)).toEqual(first);
        expect(await db.shipment.count({ where: { orderId } })).toBe(1);
        expect(await db.trackingEvent.count({ where: { shipment: { orderId } } })).toBe(1);
      } finally { await cleanup(orderId); }
    });

    it("enforces ownership and simulator authorization", async () => {
      const orderId = await order();
      try {
        expect(await service.create(owner, orderId)).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
        expect((await service.create(admin, orderId)).ok).toBe(true);
        expect(await service.get(owner, orderId)).toMatchObject({ ok: true, data: { orderId } });
        expect(await service.get(other, orderId)).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
        expect(await service.get({ kind: "ADMIN", adminId: ids.admin, permissions: [] }, orderId)).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      } finally { await cleanup(orderId); }
    });

    it("requires successful payment and enforces ordered idempotent transitions", async () => {
      const unpaid = await order("PENDING");
      expect(await service.create(admin, unpaid)).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
      await cleanup(unpaid);
      const orderId = await order();
      try {
        const created = await service.create(admin, orderId);
        if (!created.ok) throw new Error("Expected shipment");
        const shipmentId = created.data.shipmentId;
        expect(await service.transition(admin, shipmentId, "IN_TRANSIT")).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
        expect(await service.transition(admin, shipmentId, "DISPATCHED")).toMatchObject({ ok: true, data: { status: "DISPATCHED" } });
        expect(await service.transition(admin, shipmentId, "DISPATCHED")).toMatchObject({ ok: true, data: { status: "DISPATCHED" } });
        expect(await service.transition(admin, shipmentId, "IN_TRANSIT")).toMatchObject({ ok: true, data: { status: "IN_TRANSIT" } });
        const delivered = await service.transition(admin, shipmentId, "DELIVERED");
        expect(delivered).toMatchObject({ ok: true, data: { status: "DELIVERED", confirmation: { source: "INTERNAL_SIMULATOR" } } });
        expect(await service.transition(admin, shipmentId, "IN_TRANSIT")).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
        expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("DELIVERED");
        expect((await service.get(owner, orderId))).toMatchObject({ ok: true, data: { status: "DELIVERED", events: [{ status: "PENDING" }, { status: "DISPATCHED" }, { status: "IN_TRANSIT" }, { status: "DELIVERED" }] } });
      } finally { await cleanup(orderId); }
    });
  });
}
