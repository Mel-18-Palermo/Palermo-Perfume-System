import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import Stripe from "stripe";
import type { ApiResult, AppErrorCode } from "../../../contracts/common";
import { failure, success } from "../../../lib/api/result";
import type { Prisma, PrismaClient } from "../../../lib/db/generated/client";

export type PaymentEvent = Readonly<{
  paymentId: string;
  status: "SUCCEEDED" | "FAILED";
  providerReference: string;
}>;
export type PaymentGateway = Readonly<{
  createPayment(input: {
    paymentId: string;
    orderId: string;
    amountMinor: number;
    currency: string;
  }): Promise<{ providerReference: string; clientSecret: string | null }>;
  parseWebhook(payload: string, signature: string): PaymentEvent | null;
}>;
export type PaymentOutcome = Readonly<{
  orderId: string;
  paymentId: string;
  status: "SUCCEEDED" | "FAILED";
  providerReference: string | null;
}>;

const entityId = /^[0-9a-f-]{10,64}$/i;
const reservationWindowMs = 15 * 60 * 1000;

class PaymentFault extends Error {
  constructor(readonly code: AppErrorCode) {
    super(code);
  }
}

export class PaymentProviderUnavailableError extends Error {}

export class UnavailablePaymentGateway implements PaymentGateway {
  async createPayment(): Promise<never> {
    throw new PaymentProviderUnavailableError("Stripe payment configuration is unavailable.");
  }

  parseWebhook(): never {
    throw new PaymentProviderUnavailableError("Stripe webhook configuration is unavailable.");
  }
}

/** Deterministic test double. It is available only through explicit dependency injection. */
export class SandboxPaymentGateway implements PaymentGateway {
  constructor(private readonly secret: string) {
    if (!secret) throw new Error("An explicit sandbox webhook secret is required.");
  }

  async createPayment(input: {
    paymentId: string;
    orderId: string;
    amountMinor: number;
    currency: string;
  }): Promise<{ providerReference: string; clientSecret: null }> {
    return {
      providerReference: `sandbox_pi_${input.orderId.replaceAll("-", "").slice(0, 24)}`,
      clientSecret: null,
    };
  }

  parseWebhook(payload: string, signature: string): PaymentEvent | null {
    const expected = createHmac("sha256", this.secret).update(payload).digest("hex");
    const left = Buffer.from(expected);
    const right = Buffer.from(signature);
    if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
    try {
      const event = JSON.parse(payload) as Partial<PaymentEvent>;
      return typeof event.paymentId === "string"
        && (event.status === "SUCCEEDED" || event.status === "FAILED")
        && typeof event.providerReference === "string"
        ? event as PaymentEvent
        : null;
    } catch {
      return null;
    }
  }
}

export class StripePaymentGateway implements PaymentGateway {
  private readonly stripe: Stripe;

  constructor(private readonly secretKey: string, private readonly webhookSecret: string) {
    if (!secretKey.startsWith("sk_test_") || !webhookSecret.startsWith("whsec_")) {
      throw new PaymentProviderUnavailableError("Stripe test-mode credentials are not configured.");
    }
    this.stripe = new Stripe(secretKey);
  }

  async createPayment(input: {
    paymentId: string;
    orderId: string;
    amountMinor: number;
    currency: string;
  }): Promise<{ providerReference: string; clientSecret: string }> {
    const intent = await this.stripe.paymentIntents.create({
      amount: input.amountMinor,
      currency: input.currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: { paymentId: input.paymentId, orderId: input.orderId },
    }, { idempotencyKey: `palermo-payment-${input.orderId}` });
    if (!intent.client_secret) throw new Error("Stripe PaymentIntent did not return a client secret.");
    return { providerReference: intent.id, clientSecret: intent.client_secret };
  }

  parseWebhook(payload: string, signature: string): PaymentEvent | null {
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
      if (event.type !== "payment_intent.succeeded" && event.type !== "payment_intent.payment_failed") return null;
      const intent = event.data.object as Stripe.PaymentIntent;
      const paymentId = intent.metadata.paymentId;
      if (!paymentId) return null;
      return {
        paymentId,
        status: event.type === "payment_intent.succeeded" ? "SUCCEEDED" : "FAILED",
        providerReference: intent.id,
      };
    } catch {
      return null;
    }
  }
}

export function configuredGateway(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): PaymentGateway {
  const secretKey = environment["STRIPE_SECRET_KEY"];
  const webhookSecret = environment["STRIPE_WEBHOOK_SECRET"];
  if (!secretKey || !webhookSecret) return new UnavailablePaymentGateway();
  try {
    return new StripePaymentGateway(secretKey, webhookSecret);
  } catch (error) {
    if (error instanceof PaymentProviderUnavailableError) return new UnavailablePaymentGateway();
    throw error;
  }
}

type OrderForPayment = Prisma.OrderGetPayload<{
  include: { payment: true; items: true; reservations: true };
}>;

function requiredQuantities(order: Readonly<{
  items: readonly Readonly<{ variantId: string; quantity: number }>[];
}>): Map<string, number> {
  const required = new Map<string, number>();
  for (const item of order.items) {
    required.set(item.variantId, (required.get(item.variantId) ?? 0) + item.quantity);
  }
  return required;
}

export class PaymentService {
  constructor(
    private readonly db: PrismaClient,
    private readonly gateway: PaymentGateway = configuredGateway(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async ensureActiveReservations(
    tx: Prisma.TransactionClient,
    order: OrderForPayment,
  ): Promise<Date> {
    const required = requiredQuantities(order);
    if (required.size === 0 || order.reservations.length !== required.size) throw new PaymentFault("CONFLICT");

    for (const reservation of order.reservations) {
      if (reservation.status === "ACTIVE" && reservation.expiresAt <= this.now()) {
        const expired = await tx.inventoryReservation.updateMany({
          where: { id: reservation.id, status: "ACTIVE", expiresAt: { lte: this.now() } },
          data: { status: "EXPIRED" },
        });
        if (expired.count === 1) {
          const released = await tx.inventoryBalance.updateMany({
            where: { variantId: reservation.variantId, reserved: { gte: reservation.quantity } },
            data: { reserved: { decrement: reservation.quantity } },
          });
          if (released.count !== 1) throw new PaymentFault("INTERNAL_ERROR");
        }
      }
    }

    const reservations = await tx.inventoryReservation.findMany({ where: { orderId: order.id } });
    const expiresAt = new Date(this.now().getTime() + reservationWindowMs);
    for (const [variantId, quantity] of required) {
      const reservation = reservations.find(value => value.variantId === variantId);
      if (!reservation || reservation.quantity !== quantity || reservation.status === "COMMITTED") {
        throw new PaymentFault("CONFLICT");
      }
      if (reservation.status === "ACTIVE" && reservation.expiresAt > this.now()) continue;
      if (reservation.status !== "RELEASED" && reservation.status !== "EXPIRED") {
        throw new PaymentFault("CONFLICT");
      }
      const balance = await tx.inventoryBalance.findUnique({ where: { variantId } });
      const claimed = await tx.inventoryBalance.updateMany({
        where: {
          variantId,
          onHand: { gte: quantity },
          reserved: { lte: balance ? balance.onHand - quantity : -1 },
        },
        data: { reserved: { increment: quantity } },
      });
      if (claimed.count !== 1) throw new PaymentFault("CONFLICT");
      const reactivated = await tx.inventoryReservation.updateMany({
        where: { id: reservation.id, status: { in: ["RELEASED", "EXPIRED"] }, quantity },
        data: { status: "ACTIVE", expiresAt },
      });
      if (reactivated.count !== 1) throw new PaymentFault("CONFLICT");
    }
    const active = await tx.inventoryReservation.findMany({ where: { orderId: order.id, status: "ACTIVE" } });
    if (active.length !== required.size || active.some(value => value.expiresAt <= this.now())) {
      throw new PaymentFault("CONFLICT");
    }
    const first = active[0];
    if (!first) throw new PaymentFault("CONFLICT");
    return active.reduce(
      (earliest, value) => value.expiresAt < earliest ? value.expiresAt : earliest,
      first.expiresAt,
    );
  }

  async initiate(customerId: string, orderId: string): Promise<ApiResult<Readonly<{
    paymentId: string;
    providerReference: string;
    clientSecret: string | null;
  }>>> {
    if (!entityId.test(customerId) || !entityId.test(orderId)) return failure("VALIDATION_ERROR");
    const order = await this.db.order.findFirst({
      where: { id: orderId, customerId },
      include: { payment: true, items: true, reservations: true },
    });
    if (!order) return failure("NOT_FOUND");
    if (order.payment?.status === "SUCCEEDED" && order.payment.providerReference) {
      return success({
        paymentId: order.payment.id,
        providerReference: order.payment.providerReference,
        clientSecret: null,
      });
    }
    if (!order.payment || order.status !== "PLACED") return failure("CONFLICT");

    let created: { providerReference: string; clientSecret: string | null };
    try {
      created = await this.gateway.createPayment({
        paymentId: order.payment.id,
        orderId,
        amountMinor: order.totalMinor,
        currency: order.currency,
      });
    } catch (error) {
      return failure(error instanceof PaymentProviderUnavailableError
        ? "TEMPORARILY_UNAVAILABLE"
        : "INTEGRATION_ERROR");
    }

    try {
      const paymentId = order.payment.id;
      await this.db.$transaction(async (tx) => {
        const current = await tx.order.findFirst({
          where: { id: orderId, customerId, status: "PLACED" },
          include: { payment: true, items: true, reservations: true },
        });
        if (!current?.payment || current.payment.status === "SUCCEEDED") throw new PaymentFault("CONFLICT");
        if (current.payment.providerReference && current.payment.providerReference !== created.providerReference) {
          throw new PaymentFault("CONFLICT");
        }
        await this.ensureActiveReservations(tx, current);
        const updated = await tx.payment.updateMany({
          where: {
            id: paymentId,
            status: { in: ["PENDING", "FAILED", "EXPIRED"] },
            OR: [{ providerReference: null }, { providerReference: created.providerReference }],
          },
          data: { status: "PENDING", providerReference: created.providerReference },
        });
        if (updated.count !== 1) throw new PaymentFault("CONFLICT");
      });
      return success({
        paymentId: order.payment.id,
        providerReference: created.providerReference,
        clientSecret: created.clientSecret,
      });
    } catch (error) {
      if (error instanceof PaymentFault) return failure(error.code);
      throw error;
    }
  }

  private async failed(event: PaymentEvent): Promise<ApiResult<PaymentOutcome>> {
    const result = await this.db.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: event.paymentId },
        include: { order: { include: { reservations: true } } },
      });
      if (!payment) return { kind: "NOT_FOUND" as const };
      if (payment.providerReference && payment.providerReference !== event.providerReference) {
        return { kind: "CONFLICT" as const };
      }
      if (payment.status === "SUCCEEDED") return { kind: "DONE" as const, payment };
      if (payment.status === "FAILED") return { kind: "DONE" as const, payment };
      const claimed = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: "PENDING",
          OR: [{ providerReference: null }, { providerReference: event.providerReference }],
        },
        data: { status: "FAILED", providerReference: event.providerReference },
      });
      if (claimed.count !== 1) return { kind: "RACE" as const, paymentId: payment.id };
      for (const reservation of payment.order.reservations) {
        const released = await tx.inventoryReservation.updateMany({
          where: { id: reservation.id, status: "ACTIVE" },
          data: { status: "RELEASED" },
        });
        if (released.count === 1) {
          const balance = await tx.inventoryBalance.updateMany({
            where: { variantId: reservation.variantId, reserved: { gte: reservation.quantity } },
            data: { reserved: { decrement: reservation.quantity } },
          });
          if (balance.count !== 1) throw new PaymentFault("INTERNAL_ERROR");
        }
      }
      return {
        kind: "DONE" as const,
        payment: await tx.payment.findUniqueOrThrow({ where: { id: payment.id } }),
      };
    });
    if (result.kind === "NOT_FOUND") return failure("NOT_FOUND");
    if (result.kind === "CONFLICT") return failure("CONFLICT");
    const payment = result.kind === "RACE"
      ? await this.db.payment.findUnique({ where: { id: result.paymentId } })
      : result.payment;
    if (!payment || (payment.status !== "FAILED" && payment.status !== "SUCCEEDED")) return failure("CONFLICT");
    return success({
      orderId: payment.orderId,
      paymentId: payment.id,
      status: payment.status,
      providerReference: payment.providerReference,
    });
  }

  private async succeeded(event: PaymentEvent): Promise<ApiResult<PaymentOutcome>> {
    try {
      const result = await this.db.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({
          where: { id: event.paymentId },
          include: { order: { include: { items: true, reservations: true } } },
        });
        if (!payment) return { kind: "NOT_FOUND" as const };
        if (payment.providerReference && payment.providerReference !== event.providerReference) {
          return { kind: "CONFLICT" as const };
        }
        if (payment.status === "SUCCEEDED") return { kind: "DONE" as const, payment };
        if (payment.status !== "PENDING" || payment.order.status !== "PLACED") {
          return { kind: "CONFLICT" as const };
        }
        const required = requiredQuantities(payment.order);
        if (required.size === 0 || payment.order.reservations.length !== required.size) {
          return { kind: "CONFLICT" as const };
        }
        for (const [variantId, quantity] of required) {
          const reservation = payment.order.reservations.find(value => value.variantId === variantId);
          if (!reservation || reservation.quantity !== quantity || reservation.status !== "ACTIVE"
            || reservation.expiresAt <= this.now()) return { kind: "CONFLICT" as const };
        }

        const claimed = await tx.payment.updateMany({
          where: {
            id: payment.id,
            status: "PENDING",
            OR: [{ providerReference: null }, { providerReference: event.providerReference }],
          },
          data: { status: "SUCCEEDED", providerReference: event.providerReference },
        });
        if (claimed.count !== 1) return { kind: "RACE" as const, paymentId: payment.id };

        for (const [variantId, quantity] of required) {
          const reservation = payment.order.reservations.find(value => value.variantId === variantId);
          if (!reservation) throw new PaymentFault("CONFLICT");
          const committed = await tx.inventoryReservation.updateMany({
            where: { id: reservation.id, orderId: payment.orderId, variantId, quantity, status: "ACTIVE", expiresAt: { gt: this.now() } },
            data: { status: "COMMITTED" },
          });
          if (committed.count !== 1) throw new PaymentFault("CONFLICT");
          const balance = await tx.inventoryBalance.updateMany({
            where: { variantId, onHand: { gte: quantity }, reserved: { gte: quantity } },
            data: { onHand: { decrement: quantity }, reserved: { decrement: quantity } },
          });
          if (balance.count !== 1) throw new PaymentFault("CONFLICT");
          await tx.inventoryMovement.create({
            data: {
              id: randomUUID(),
              variantId,
              quantityDelta: -quantity,
              reason: "ORDER_PAYMENT_COMMITTED",
              reference: `payment-${payment.orderId}-${variantId}`,
            },
          });
        }
        const confirmed = await tx.order.updateMany({
          where: { id: payment.orderId, status: "PLACED" },
          data: { status: "CONFIRMED" },
        });
        if (confirmed.count !== 1) throw new PaymentFault("CONFLICT");
        await tx.invoice.create({
          data: {
            id: randomUUID(),
            orderId: payment.orderId,
            invoiceNumber: `PAL-INV-${payment.order.orderNumber}`,
            totalMinor: payment.order.totalMinor,
            currency: payment.order.currency,
            paymentReferenceSnapshot: event.providerReference,
            issuedAt: this.now(),
          },
        });
        return {
          kind: "DONE" as const,
          payment: await tx.payment.findUniqueOrThrow({ where: { id: payment.id } }),
        };
      });
      if (result.kind === "NOT_FOUND") return failure("NOT_FOUND");
      if (result.kind === "CONFLICT") return failure("CONFLICT");
      const payment = result.kind === "RACE"
        ? await this.db.payment.findUnique({ where: { id: result.paymentId } })
        : result.payment;
      if (!payment || payment.status !== "SUCCEEDED") return failure("CONFLICT");
      return success({
        orderId: payment.orderId,
        paymentId: payment.id,
        status: "SUCCEEDED",
        providerReference: payment.providerReference,
      });
    } catch (error) {
      if (error instanceof PaymentFault) return failure(error.code);
      throw error;
    }
  }

  async webhook(payload: string, signature: string): Promise<ApiResult<PaymentOutcome>> {
    let event: PaymentEvent | null;
    try {
      event = this.gateway.parseWebhook(payload, signature);
    } catch (error) {
      return failure(error instanceof PaymentProviderUnavailableError
        ? "TEMPORARILY_UNAVAILABLE"
        : "INTEGRATION_ERROR");
    }
    if (!event) return failure("FORBIDDEN");
    return event.status === "FAILED" ? this.failed(event) : this.succeeded(event);
  }
}
