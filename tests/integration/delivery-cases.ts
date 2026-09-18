import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { DeliveryService, type DeliveryActor } from "../../src/modules/delivery/service";
import type { DeliveryProvider } from "../../src/integrations/delivery/provider";
import { OrdersService } from "../../src/modules/commerce/orders/service";
import { ids } from "../../prisma/seed-data";

const admin: DeliveryActor = { kind: "ADMIN", adminId: ids.admin, permissions: ["delivery:manage"] };
const owner: DeliveryActor = { kind: "CUSTOMER", customerId: ids.customer };
const other: DeliveryActor = { kind: "CUSTOMER", customerId: ids.otherCustomer };

class FailingProvider implements DeliveryProvider {
  constructor(private readonly mode: "create" | "transition") {}
  create(): { trackingReference: string } { if (this.mode === "create") throw new Error("provider unavailable"); return { trackingReference: "FAILURE-TEST" }; }
  transition(): { description: string } { if (this.mode === "transition") throw new Error("provider unavailable"); return { description: "failure test" }; }
}

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

    it("keeps concurrent creation and transitions single-effect", async () => {
      const orderId = await order();
      try {
        const creates = await Promise.all([service.create(admin, orderId), service.create(admin, orderId)]);
        expect(creates.every(result => result.ok)).toBe(true);
        const shipmentId = creates[0]?.ok ? creates[0].data.shipmentId : "";
        const transitions = await Promise.all([
          service.transition(admin, shipmentId, "DISPATCHED"),
          service.transition(admin, shipmentId, "DISPATCHED"),
        ]);
        expect(transitions.every(result => result.ok)).toBe(true);
        expect(await db.trackingEvent.count({ where: { shipmentId, status: "DISPATCHED" } })).toBe(1);
        expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("SHIPPED");
      } finally { await cleanup(orderId); }
    });

    it("contains provider failures without partial persistence", async () => {
      const createOrder = await order();
      try {
        expect(await new DeliveryService(db, new FailingProvider("create")).create(admin, createOrder)).toMatchObject({ ok: false, error: { code: "INTEGRATION_ERROR" } });
        expect(await db.shipment.count({ where: { orderId: createOrder } })).toBe(0);
      } finally { await cleanup(createOrder); }

      const transitionOrder = await order();
      try {
        const created = await service.create(admin, transitionOrder);
        if (!created.ok) throw new Error("Expected shipment");
        const failing = new DeliveryService(db, new FailingProvider("transition"));
        expect(await failing.transition(admin, created.data.shipmentId, "DISPATCHED")).toMatchObject({ ok: false, error: { code: "INTEGRATION_ERROR" } });
        expect(await db.shipment.findUniqueOrThrow({ where: { id: created.data.shipmentId } })).toMatchObject({ status: "PENDING", deliveredAt: null });
        expect(await db.trackingEvent.count({ where: { shipmentId: created.data.shipmentId } })).toBe(1);
      } finally { await cleanup(transitionOrder); }
    });

    it("synchronizes dispatch/cancellation authority", async () => {
      const cancelled = await order();
      try {
        await db.order.update({ where: { id: cancelled }, data: { cancellationRequestedAt: new Date("2026-09-08T00:00:00.000Z"), cancellationIdempotencyKey: `cancel-${cancelled}` } });
        const created = await service.create(admin, cancelled);
        if (!created.ok) throw new Error("Expected shipment");
        expect(await service.transition(admin, created.data.shipmentId, "DISPATCHED")).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
        expect(await db.shipment.findUniqueOrThrow({ where: { id: created.data.shipmentId } })).toMatchObject({ status: "PENDING" });
      } finally { await cleanup(cancelled); }

      const raced = await order();
      try {
        const created = await service.create(admin, raced);
        if (!created.ok) throw new Error("Expected shipment");
        const orderService = new OrdersService(db);
        const [dispatch, cancel] = await Promise.all([
          service.transition(admin, created.data.shipmentId, "DISPATCHED"),
          orderService.cancel(ids.customer, raced, `cancel-${raced}`),
        ]);
        const current = await db.order.findUniqueOrThrow({ where: { id: raced }, include: { shipment: true } });
        expect((dispatch.ok && cancel.ok) ? "both" : "one").toBe("one");
        expect(current.status === "SHIPPED" ? current.cancellationRequestedAt : current.shipment?.status).toBe(current.status === "SHIPPED" ? null : "PENDING");
      } finally { await cleanup(raced); }
    });
  });
}
