import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import type { PrismaClient } from "../../../lib/db/generated/client";
import type { ApiResult } from "../../../contracts/common";
import { failure, success } from "../../../lib/api/result";

export type PaymentGateway = Readonly<{ createPayment(input: { orderId: string; amountMinor: number; currency: string }): Promise<{ providerReference: string }>; verifyWebhook(payload: string, signature: string): boolean }>;
export type PaymentOutcome = Readonly<{ orderId: string; paymentId: string; status: "SUCCEEDED" | "FAILED"; providerReference: string | null }>;
export class SandboxPaymentGateway implements PaymentGateway {
  constructor(private readonly secret = process.env["STRIPE_WEBHOOK_SECRET"] ?? "palermo-sandbox-webhook") {}
  async createPayment(input: { orderId: string; amountMinor: number; currency: string }): Promise<{ providerReference: string }> { return { providerReference: `sandbox_pi_${input.orderId.replaceAll("-", "").slice(0, 24)}` }; }
  verifyWebhook(payload: string, signature: string): boolean { const expected = createHmac("sha256", this.secret).update(payload).digest("hex"); const left = Buffer.from(expected); const right = Buffer.from(signature); return left.length === right.length && timingSafeEqual(left, right); }
}
export class PaymentService {
  constructor(private readonly db: PrismaClient, private readonly gateway: PaymentGateway = new SandboxPaymentGateway()) {}
  async initiate(customerId: string, orderId: string): Promise<ApiResult<Readonly<{ paymentId: string; providerReference: string }>>> {
    const order = await this.db.order.findFirst({ where: { id: orderId, customerId }, include: { payment: true } }); if (!order) return failure("NOT_FOUND"); if (order.payment?.status === "SUCCEEDED" && order.payment.providerReference) return success({ paymentId: order.payment.id, providerReference: order.payment.providerReference }); const payment = order.payment ?? await this.db.payment.create({ data: { id: randomUUID(), orderId } }); const created = await this.gateway.createPayment({ orderId, amountMinor: order.totalMinor, currency: order.currency }); await this.db.payment.update({ where: { id: payment.id }, data: { providerReference: created.providerReference } }); return success({ paymentId: payment.id, providerReference: created.providerReference });
  }
  async webhook(payload: string, signature: string): Promise<ApiResult<PaymentOutcome>> {
    if (!this.gateway.verifyWebhook(payload, signature)) return failure("FORBIDDEN"); let event: { paymentId?: string; status?: "SUCCEEDED" | "FAILED"; providerReference?: string }; try { event = JSON.parse(payload) as typeof event; } catch { return failure("VALIDATION_ERROR"); } if (!event.paymentId || !event.status || !event.providerReference) return failure("VALIDATION_ERROR");
    const payment = await this.db.payment.findUnique({ where: { id: event.paymentId }, include: { order: { include: { items: true } } } }); if (!payment) return failure("NOT_FOUND"); const providerReference = event.providerReference; if (payment.providerReference && payment.providerReference !== providerReference) return failure("CONFLICT"); if (payment.status === "SUCCEEDED") return success({ orderId: payment.orderId, paymentId: payment.id, status: "SUCCEEDED", providerReference: payment.providerReference }); if (event.status === "FAILED") { await this.db.payment.update({ where: { id: payment.id }, data: { status: "FAILED", providerReference } }); return success({ orderId: payment.orderId, paymentId: payment.id, status: "FAILED", providerReference }); }
    await this.db.$transaction(async tx => { await tx.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED", providerReference } }); await tx.order.update({ where: { id: payment.orderId }, data: { status: "CONFIRMED" } }); for (const item of payment.order.items) { await tx.inventoryReservation.updateMany({ where: { orderId: payment.orderId, variantId: item.variantId, status: "ACTIVE" }, data: { status: "COMMITTED" } }); await tx.inventoryBalance.update({ where: { variantId: item.variantId }, data: { onHand: { decrement: item.quantity }, reserved: { decrement: item.quantity } } }); await tx.inventoryMovement.create({ data: { id: randomUUID(), variantId: item.variantId, quantityDelta: -item.quantity, reason: "ORDER_PAYMENT_COMMITTED", reference: `payment-${payment.orderId}-${item.variantId}` } }); } });
    return success({ orderId: payment.orderId, paymentId: payment.id, status: "SUCCEEDED", providerReference });
  }
}
