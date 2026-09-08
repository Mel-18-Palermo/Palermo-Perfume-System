import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import Stripe from "stripe";
import type { PrismaClient } from "../../../lib/db/generated/client";
import type { ApiResult } from "../../../contracts/common";
import { failure, success } from "../../../lib/api/result";

type PaymentEvent = Readonly<{ paymentId: string; status: "SUCCEEDED" | "FAILED"; providerReference: string }>;
export type PaymentGateway = Readonly<{
  createPayment(input: { paymentId: string; orderId: string; amountMinor: number; currency: string }): Promise<{ providerReference: string; clientSecret: string | null }>;
  parseWebhook(payload: string, signature: string): PaymentEvent | null;
}>;
export type PaymentOutcome = Readonly<{ orderId: string; paymentId: string; status: "SUCCEEDED" | "FAILED"; providerReference: string | null }>;

export class SandboxPaymentGateway implements PaymentGateway {
  constructor(private readonly secret = process.env["STRIPE_WEBHOOK_SECRET"] ?? "palermo-sandbox-webhook") {}
  async createPayment(input: { paymentId: string; orderId: string; amountMinor: number; currency: string }): Promise<{ providerReference: string; clientSecret: string | null }> { return { providerReference: `sandbox_pi_${input.orderId.replaceAll("-", "").slice(0, 24)}`, clientSecret: null }; }
  parseWebhook(payload: string, signature: string): PaymentEvent | null { const expected = createHmac("sha256", this.secret).update(payload).digest("hex"); const left = Buffer.from(expected); const right = Buffer.from(signature); if (left.length !== right.length || !timingSafeEqual(left, right)) return null; try { const event = JSON.parse(payload) as Partial<PaymentEvent>; return typeof event.paymentId === "string" && (event.status === "SUCCEEDED" || event.status === "FAILED") && typeof event.providerReference === "string" ? event as PaymentEvent : null; } catch { return null; } }
}

export class StripePaymentGateway implements PaymentGateway {
  private readonly stripe: Stripe;
  constructor(private readonly secretKey = process.env["STRIPE_SECRET_KEY"], private readonly webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"]) { if (!secretKey || !webhookSecret) throw new Error("Stripe test-mode credentials are not configured."); this.stripe = new Stripe(secretKey); }
  async createPayment(input: { paymentId: string; orderId: string; amountMinor: number; currency: string }): Promise<{ providerReference: string; clientSecret: string }> { const intent = await this.stripe.paymentIntents.create({ amount: input.amountMinor, currency: input.currency.toLowerCase(), automatic_payment_methods: { enabled: true }, metadata: { paymentId: input.paymentId, orderId: input.orderId } }, { idempotencyKey: `palermo-payment-${input.orderId}` }); if (!intent.client_secret) throw new Error("Stripe PaymentIntent did not return a client secret."); return { providerReference: intent.id, clientSecret: intent.client_secret }; }
  parseWebhook(payload: string, signature: string): PaymentEvent | null { try { const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret as string); if (event.type !== "payment_intent.succeeded" && event.type !== "payment_intent.payment_failed") return null; const intent = event.data.object as Stripe.PaymentIntent; const paymentId = intent.metadata.paymentId; if (!paymentId) return null; return { paymentId, status: event.type === "payment_intent.succeeded" ? "SUCCEEDED" : "FAILED", providerReference: intent.id }; } catch { return null; } }
}

function configuredGateway(): PaymentGateway { return process.env["STRIPE_SECRET_KEY"] && process.env["STRIPE_WEBHOOK_SECRET"] ? new StripePaymentGateway() : new SandboxPaymentGateway(); }

export class PaymentService {
  constructor(private readonly db: PrismaClient, private readonly gateway: PaymentGateway = configuredGateway()) {}
  async initiate(customerId: string, orderId: string): Promise<ApiResult<Readonly<{ paymentId: string; providerReference: string; clientSecret: string | null }>>> {
    const order = await this.db.order.findFirst({ where: { id: orderId, customerId }, include: { payment: true } }); if (!order) return failure("NOT_FOUND"); if (order.payment?.status === "SUCCEEDED" && order.payment.providerReference) return success({ paymentId: order.payment.id, providerReference: order.payment.providerReference, clientSecret: null }); const payment = order.payment ?? await this.db.payment.create({ data: { id: randomUUID(), orderId } }); const created = await this.gateway.createPayment({ paymentId: payment.id, orderId, amountMinor: order.totalMinor, currency: order.currency }); await this.db.payment.update({ where: { id: payment.id }, data: { providerReference: created.providerReference } }); return success({ paymentId: payment.id, providerReference: created.providerReference, clientSecret: created.clientSecret });
  }
  async webhook(payload: string, signature: string): Promise<ApiResult<PaymentOutcome>> {
    const event = this.gateway.parseWebhook(payload, signature); if (!event) return failure("FORBIDDEN"); const payment = await this.db.payment.findUnique({ where: { id: event.paymentId }, include: { order: { include: { items: true } } } }); if (!payment) return failure("NOT_FOUND"); if (payment.providerReference && payment.providerReference !== event.providerReference) return failure("CONFLICT"); if (payment.status === "SUCCEEDED") return success({ orderId: payment.orderId, paymentId: payment.id, status: "SUCCEEDED", providerReference: payment.providerReference }); if (event.status === "FAILED") { await this.db.payment.update({ where: { id: payment.id }, data: { status: "FAILED", providerReference: event.providerReference } }); return success({ orderId: payment.orderId, paymentId: payment.id, status: "FAILED", providerReference: event.providerReference }); }
    await this.db.$transaction(async tx => { await tx.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED", providerReference: event.providerReference } }); await tx.order.update({ where: { id: payment.orderId }, data: { status: "CONFIRMED" } }); for (const item of payment.order.items) { await tx.inventoryReservation.updateMany({ where: { orderId: payment.orderId, variantId: item.variantId, status: "ACTIVE" }, data: { status: "COMMITTED" } }); await tx.inventoryBalance.update({ where: { variantId: item.variantId }, data: { onHand: { decrement: item.quantity }, reserved: { decrement: item.quantity } } }); await tx.inventoryMovement.create({ data: { id: randomUUID(), variantId: item.variantId, quantityDelta: -item.quantity, reason: "ORDER_PAYMENT_COMMITTED", reference: `payment-${payment.orderId}-${item.variantId}` } }); } });
    return success({ orderId: payment.orderId, paymentId: payment.id, status: "SUCCEEDED", providerReference: event.providerReference });
  }
}
