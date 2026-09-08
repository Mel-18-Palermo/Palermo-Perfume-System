import { createHmac, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ids } from "../../prisma/seed-data";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { InventoryService } from "../../src/modules/inventory/service";
import {
  PaymentService,
  SandboxPaymentGateway,
  UnavailablePaymentGateway,
} from "../../src/modules/commerce/payment/service";

const initialTime = new Date("2026-09-08T00:00:00.000Z");
const secret = "explicit-payment-test-secret";
const addressSnapshot = {
  recipientName: "Payment Test",
  line1: "1 Test Street",
  line2: null,
  suburb: "Melbourne",
  state: "VIC",
  postcode: "3000",
  country: "AU",
};

function signature(payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function value<T>(result: { ok: true; data: T } | { ok: false; error: unknown }): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected successful payment result");
  return result.data;
}

export function paymentCases(db: PrismaClient): void {
  describe("authoritative payment finalisation", () => {
    async function setup(quantity = 2): Promise<{
      orderId: string;
      paymentId: string;
      reservationId: string;
      variantId: string;
    }> {
      const token = randomUUID();
      const variant = await db.perfumeVariant.create({
        data: {
          perfumeId: ids.woodyPerfume,
          sku: `PAYMENT-${token.slice(0, 8)}`,
          bottleSize: "50 ml",
          concentration: "Eau de Parfum",
          priceMinor: 15000,
          currency: "AUD",
        },
      });
      await db.inventoryBalance.create({
        data: { variantId: variant.id, onHand: 10, reserved: quantity, lowStockThreshold: 2 },
      });
      const order = await db.order.create({
        data: {
          customerId: ids.otherCustomer,
          orderNumber: `PAY-${token}`,
          idempotencyKey: `payment:${token}`,
          requestFingerprint: `fingerprint:${token}`,
          deliveryMethodId: ids.delivery,
          status: "PLACED",
          subtotalMinor: 15000 * quantity,
          discountTotalMinor: 0,
          deliveryChargeMinor: 1000,
          totalMinor: 15000 * quantity + 1000,
          currency: "AUD",
          deliveryAddressSnapshot: addressSnapshot,
          billingAddressSnapshot: addressSnapshot,
          deliveryMethodSnapshot: { id: ids.delivery, name: "Demo delivery", chargeMinor: 1000, currency: "AUD" },
          items: {
            create: {
              variantId: variant.id,
              skuSnapshot: variant.sku,
              nameSnapshot: "Payment Test Perfume",
              unitPriceMinor: 15000,
              quantity,
            },
          },
          payment: { create: {} },
        },
        include: { payment: true },
      });
      const reservation = await db.inventoryReservation.create({
        data: {
          orderId: order.id,
          variantId: variant.id,
          quantity,
          expiresAt: new Date("2026-09-08T00:15:00.000Z"),
        },
      });
      if (!order.payment) throw new Error("Payment setup did not create a payment");
      return { orderId: order.id, paymentId: order.payment.id, reservationId: reservation.id, variantId: variant.id };
    }

    function service(now: () => Date = () => initialTime): PaymentService {
      return new PaymentService(db, new SandboxPaymentGateway(secret), now);
    }

    async function event(
      paymentService: PaymentService,
      paymentId: string,
      providerReference: string,
      status: "SUCCEEDED" | "FAILED",
      options: Readonly<{ eventId?: string; attemptSequence?: number }> = {},
    ) {
      const payment = await db.payment.findUniqueOrThrow({ where: { id: paymentId } });
      const payload = JSON.stringify({
        eventId: options.eventId ?? `evt_${randomUUID()}`,
        paymentId,
        status,
        providerReference,
        attemptSequence: options.attemptSequence ?? payment.attemptSequence,
      });
      return paymentService.webhook(payload, signature(payload));
    }

    it("initiates only an owned payable order and stores provider references without card data", async () => {
      const record = await setup();
      const paymentService = service();
      const denied = await paymentService.initiate(ids.customer, record.orderId);
      expect(denied.ok).toBe(false);
      if (!denied.ok) expect(denied.error.code).toBe("NOT_FOUND");
      const initiated = value(await paymentService.initiate(ids.otherCustomer, record.orderId));
      expect(initiated).toMatchObject({ paymentId: record.paymentId, clientSecret: null });
      expect(initiated.providerReference).toMatch(/^sandbox_pi_/);
      const persisted = await db.payment.findUniqueOrThrow({ where: { id: record.paymentId } });
      expect(persisted.providerReference).toBe(initiated.providerReference);
      expect(persisted.attemptSequence).toBe(1);
      expect(Object.keys(persisted)).not.toEqual(expect.arrayContaining(["pan", "cardNumber", "cvc", "cvv", "expiry"]));
    });

    it("fails closed without configured Stripe transport and preserves the reservation", async () => {
      const record = await setup();
      const unavailable = new PaymentService(db, new UnavailablePaymentGateway(), () => initialTime);
      const result = await unavailable.initiate(ids.otherCustomer, record.orderId);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("TEMPORARILY_UNAVAILABLE");
      expect(await db.payment.findUniqueOrThrow({ where: { id: record.paymentId } })).toMatchObject({
        status: "PENDING",
        providerReference: null,
      });
      expect(await db.inventoryReservation.findUniqueOrThrow({ where: { id: record.reservationId } })).toMatchObject({
        status: "ACTIVE",
      });
      expect(await db.inventoryBalance.findUniqueOrThrow({ where: { variantId: record.variantId } })).toMatchObject({
        onHand: 10,
        reserved: 2,
      });
    });

    it("commits one active unexpired reservation and movement for duplicate success callbacks", async () => {
      const record = await setup();
      const paymentService = service();
      const initiated = value(await paymentService.initiate(ids.otherCustomer, record.orderId));
      const eventId = `evt_${randomUUID()}`;
      const results = await Promise.all([
        event(paymentService, record.paymentId, initiated.providerReference, "SUCCEEDED", { eventId }),
        event(paymentService, record.paymentId, initiated.providerReference, "SUCCEEDED", { eventId }),
      ]);
      expect(results.every(result => result.ok && result.data.status === "SUCCEEDED")).toBe(true);
      expect(await db.order.findUniqueOrThrow({ where: { id: record.orderId } })).toMatchObject({ status: "CONFIRMED" });
      expect(await db.payment.findUniqueOrThrow({ where: { id: record.paymentId } })).toMatchObject({
        status: "SUCCEEDED",
        lastProviderEventId: eventId,
      });
      expect(await db.inventoryReservation.findUniqueOrThrow({ where: { id: record.reservationId } })).toMatchObject({ status: "COMMITTED" });
      expect(await db.inventoryBalance.findUniqueOrThrow({ where: { variantId: record.variantId } })).toMatchObject({ onHand: 8, reserved: 0 });
      expect(await db.inventoryMovement.count({ where: { reference: `payment-${record.orderId}-${record.variantId}` } })).toBe(1);
      expect(await db.invoice.count({ where: { orderId: record.orderId } })).toBe(1);
      expect(await db.invoice.findUniqueOrThrow({ where: { orderId: record.orderId } })).toMatchObject({
        totalMinor: 31000,
        currency: "AUD",
        paymentReferenceSnapshot: initiated.providerReference,
      });
    });

    it("rejects forged signatures and mismatched provider references without state changes", async () => {
      const record = await setup();
      const paymentService = service();
      const initiated = value(await paymentService.initiate(ids.otherCustomer, record.orderId));
      const forgedPayload = JSON.stringify({
        eventId: `evt_${randomUUID()}`,
        paymentId: record.paymentId,
        status: "SUCCEEDED",
        providerReference: initiated.providerReference,
        attemptSequence: 1,
      });
      const forged = await paymentService.webhook(forgedPayload, "invalid");
      expect(forged.ok).toBe(false);
      if (!forged.ok) expect(forged.error.code).toBe("FORBIDDEN");
      const mismatch = await event(paymentService, record.paymentId, "sandbox_pi_different", "SUCCEEDED");
      expect(mismatch.ok).toBe(false);
      if (!mismatch.ok) expect(mismatch.error.code).toBe("CONFLICT");
      expect(await db.payment.findUniqueOrThrow({ where: { id: record.paymentId } })).toMatchObject({ status: "PENDING" });
      expect(await db.inventoryBalance.findUniqueOrThrow({ where: { variantId: record.variantId } })).toMatchObject({ onHand: 10, reserved: 2 });
      expect(await db.inventoryMovement.count({ where: { reference: { startsWith: `payment-${record.orderId}` } } })).toBe(0);
    });

    it("releases a failed payment once and supports an explicit stock-safe retry", async () => {
      const record = await setup();
      const paymentService = service();
      const initiated = value(await paymentService.initiate(ids.otherCustomer, record.orderId));
      const oldAttemptSequence = 1;
      const firstEventId = `evt_${randomUUID()}`;
      const failures = await Promise.all([
        event(paymentService, record.paymentId, initiated.providerReference, "FAILED", { eventId: firstEventId, attemptSequence: oldAttemptSequence }),
        event(paymentService, record.paymentId, initiated.providerReference, "FAILED", { attemptSequence: oldAttemptSequence }),
      ]);
      expect(failures.every(result => result.ok && result.data.status === "FAILED")).toBe(true);
      expect(await db.inventoryReservation.findUniqueOrThrow({ where: { id: record.reservationId } })).toMatchObject({ status: "RELEASED" });
      expect(await db.inventoryBalance.findUniqueOrThrow({ where: { variantId: record.variantId } })).toMatchObject({ onHand: 10, reserved: 0 });
      expect(await db.order.findUniqueOrThrow({ where: { id: record.orderId } })).toMatchObject({ status: "PLACED" });

      const retry = value(await paymentService.initiate(ids.otherCustomer, record.orderId));
      expect(retry.providerReference).not.toBe(initiated.providerReference);
      expect(await db.payment.findUniqueOrThrow({ where: { id: record.paymentId } })).toMatchObject({
        status: "PENDING",
        attemptSequence: 2,
      });
      expect(await db.inventoryReservation.findUniqueOrThrow({ where: { id: record.reservationId } })).toMatchObject({ status: "ACTIVE" });
      expect(await db.inventoryBalance.findUniqueOrThrow({ where: { variantId: record.variantId } })).toMatchObject({ onHand: 10, reserved: 2 });

      for (const eventId of [firstEventId, `evt_${randomUUID()}`]) {
        const oldFailure = await event(paymentService, record.paymentId, initiated.providerReference, "FAILED", {
          eventId,
          attemptSequence: oldAttemptSequence,
        });
        expect(oldFailure.ok).toBe(false);
        if (!oldFailure.ok) expect(oldFailure.error.code).toBe("CONFLICT");
      }
      expect(await db.inventoryReservation.findUniqueOrThrow({ where: { id: record.reservationId } })).toMatchObject({ status: "ACTIVE" });
      expect(await db.inventoryBalance.findUniqueOrThrow({ where: { variantId: record.variantId } })).toMatchObject({ onHand: 10, reserved: 2 });
      expect(value(await event(paymentService, record.paymentId, retry.providerReference, "SUCCEEDED")).status).toBe("SUCCEEDED");
      const oldFailureAfterSuccess = await event(paymentService, record.paymentId, initiated.providerReference, "FAILED", {
        attemptSequence: oldAttemptSequence,
      });
      expect(oldFailureAfterSuccess.ok).toBe(false);
      expect(await db.order.findUniqueOrThrow({ where: { id: record.orderId } })).toMatchObject({ status: "CONFIRMED" });
      expect(await db.invoice.count({ where: { orderId: record.orderId } })).toBe(1);
    });

    it("keeps a late success unresolved until an explicit retry re-establishes stock authority", async () => {
      let now = initialTime;
      const record = await setup();
      const paymentService = service(() => now);
      const initiated = value(await paymentService.initiate(ids.otherCustomer, record.orderId));
      now = new Date("2026-09-08T00:16:00.000Z");
      expect((await new InventoryService(db, () => now).expire(record.reservationId)).ok).toBe(true);
      const late = await event(paymentService, record.paymentId, initiated.providerReference, "SUCCEEDED");
      expect(late.ok).toBe(false);
      if (!late.ok) expect(late.error.code).toBe("CONFLICT");
      expect(await db.payment.findUniqueOrThrow({ where: { id: record.paymentId } })).toMatchObject({ status: "PENDING" });
      expect(await db.order.findUniqueOrThrow({ where: { id: record.orderId } })).toMatchObject({ status: "PLACED" });
      expect(await db.inventoryBalance.findUniqueOrThrow({ where: { variantId: record.variantId } })).toMatchObject({ onHand: 10, reserved: 0 });
      expect(await db.inventoryMovement.count({ where: { reference: `payment-${record.orderId}-${record.variantId}` } })).toBe(0);

      const retry = value(await paymentService.initiate(ids.otherCustomer, record.orderId));
      expect(retry.providerReference).not.toBe(initiated.providerReference);
      expect(await db.inventoryReservation.findUniqueOrThrow({ where: { id: record.reservationId } })).toMatchObject({
        status: "ACTIVE",
        expiresAt: new Date("2026-09-08T00:31:00.000Z"),
      });
      const recovered = value(await event(paymentService, record.paymentId, retry.providerReference, "SUCCEEDED"));
      expect(recovered.status).toBe("SUCCEEDED");
      expect(await db.inventoryBalance.findUniqueOrThrow({ where: { variantId: record.variantId } })).toMatchObject({ onHand: 8, reserved: 0 });
      expect(await db.inventoryMovement.count({ where: { reference: `payment-${record.orderId}-${record.variantId}` } })).toBe(1);
    });

    it("processes concurrent success and failure once without regressing a successful outcome", async () => {
      const record = await setup();
      const paymentService = service();
      const initiated = value(await paymentService.initiate(ids.otherCustomer, record.orderId));
      const results = await Promise.all([
        event(paymentService, record.paymentId, initiated.providerReference, "SUCCEEDED"),
        event(paymentService, record.paymentId, initiated.providerReference, "FAILED"),
      ]);
      const payment = await db.payment.findUniqueOrThrow({ where: { id: record.paymentId } });
      const order = await db.order.findUniqueOrThrow({ where: { id: record.orderId } });
      const movementCount = await db.inventoryMovement.count({ where: { reference: `payment-${record.orderId}-${record.variantId}` } });
      const invoiceCount = await db.invoice.count({ where: { orderId: record.orderId } });

      if (payment.status === "SUCCEEDED") {
        expect(results.some(result => result.ok && result.data.status === "SUCCEEDED")).toBe(true);
        expect(order.status).toBe("CONFIRMED");
        expect(movementCount).toBe(1);
        expect(invoiceCount).toBe(1);
        const lateFailure = await event(paymentService, record.paymentId, initiated.providerReference, "FAILED");
        expect(lateFailure.ok && lateFailure.data.status === "SUCCEEDED").toBe(true);
        expect(await db.order.findUniqueOrThrow({ where: { id: record.orderId } })).toMatchObject({ status: "CONFIRMED" });
        expect(await db.invoice.count({ where: { orderId: record.orderId } })).toBe(1);
      } else {
        expect(payment.status).toBe("FAILED");
        expect(order.status).toBe("PLACED");
        expect(movementCount).toBe(0);
        expect(invoiceCount).toBe(0);
      }
    });

    it("rolls back the complete success transaction when reservation proof is missing", async () => {
      const record = await setup();
      const paymentService = service();
      const initiated = value(await paymentService.initiate(ids.otherCustomer, record.orderId));
      await db.inventoryReservation.update({
        where: { id: record.reservationId },
        data: { status: "RELEASED" },
      });
      await db.inventoryBalance.update({
        where: { variantId: record.variantId },
        data: { reserved: 0 },
      });
      const result = await event(paymentService, record.paymentId, initiated.providerReference, "SUCCEEDED");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("CONFLICT");
      expect(await db.payment.findUniqueOrThrow({ where: { id: record.paymentId } })).toMatchObject({ status: "PENDING" });
      expect(await db.order.findUniqueOrThrow({ where: { id: record.orderId } })).toMatchObject({ status: "PLACED" });
      expect(await db.inventoryBalance.findUniqueOrThrow({ where: { variantId: record.variantId } })).toMatchObject({ onHand: 10, reserved: 0 });
      expect(await db.inventoryMovement.count({ where: { reference: `payment-${record.orderId}-${record.variantId}` } })).toBe(0);
    });
  });
}
