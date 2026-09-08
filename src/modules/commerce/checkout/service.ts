import { createHash, randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "../../../lib/db/generated/client";
import type { CheckoutApi, CheckoutRequest, CheckoutResult, DeliveryMethod } from "../../../contracts/checkout";
import type { ApiResult } from "../../../contracts/common";
import { failure, success } from "../../../lib/api/result";
import { isVariantSellable } from "../availability";
import { CartService } from "../cart/service";

const RESERVATION_WINDOW_MS = 15 * 60 * 1000;
const include = { items: { include: { variant: { include: { perfume: true, inventory: true } } } }, promotion: true } as const;
type Cart = Prisma.CartGetPayload<{ include: typeof include }>;

class CheckoutAbort extends Error {
  constructor(readonly outcome: CheckoutResult | "CART_REVIEW") { super("CHECKOUT_ABORT"); }
}

function id(value: string): boolean { return /^[0-9a-f-]{10,64}$/i.test(value); }
function fingerprint(input: CheckoutRequest): string { return createHash("sha256").update(JSON.stringify(input)).digest("hex"); }
function isUniqueConflict(error: unknown): boolean { return typeof error === "object" && error !== null && "code" in error && error.code === "P2002"; }
function options(value: Prisma.JsonValue): readonly string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function customisationValid(item: Cart["items"][number]): boolean {
  return (item.personalisedLabel === null || item.variant.personalisedLabel)
    && (item.engravingName === null || item.variant.engravingName)
    && (item.giftMessage === null || item.variant.giftMessage)
    && (item.giftPackagingId === null || options(item.variant.giftPackagingOptions).includes(item.giftPackagingId));
}
function promotionEligible(promotion: NonNullable<Cart["promotion"]>, currency: string, now: Date): boolean {
  if (!promotion.active || (promotion.activeFrom && promotion.activeFrom > now) || (promotion.activeUntil && promotion.activeUntil <= now)) return false;
  if (promotion.currency !== null && promotion.currency !== currency) return false;
  if (typeof promotion.eligibility !== "object" || promotion.eligibility === null || Array.isArray(promotion.eligibility)) return false;
  // No non-empty eligibility rule has a canonical schema yet. Unknown rules fail closed.
  return Object.keys(promotion.eligibility).length === 0;
}
function money(cart: Cart, now: Date): { subtotal: number; discount: number; total: number } {
  const subtotal = cart.items.reduce((sum, item) => sum + item.variant.priceMinor * item.quantity, 0);
  const currency = cart.items[0]?.variant.currency ?? "AUD";
  const promotion = cart.promotion;
  const discount = promotion && promotionEligible(promotion, currency, now)
    ? promotion.discountType === "FIXED"
      ? Math.min(subtotal, promotion.discountValue)
      : Math.min(subtotal, Math.floor(subtotal * promotion.discountValue / 10000))
    : 0;
  return { subtotal, discount, total: subtotal - discount };
}

export class CheckoutService {
  constructor(private readonly db: PrismaClient, private readonly now: () => Date = () => new Date()) {}

  async getDeliveryMethods(): Promise<ApiResult<readonly DeliveryMethod[]>> {
    const methods = await this.db.deliveryMethod.findMany({ where: { active: true }, orderBy: { chargeMinor: "asc" } });
    return success(methods.map(method => ({ id: method.id, name: method.name, charge: { amountMinor: method.chargeMinor, currency: method.currency }, displayInformation: method.displayInformation })));
  }

  private async cartReview(customerId: string): Promise<ApiResult<CheckoutResult>> {
    const current = await new CartService(this.db, this.now).get({ kind: "CUSTOMER", customerId });
    return current.ok ? success({ status: "REQUIRES_CART_REVIEW", cart: current.data }) : current;
  }

  private async replay(customerId: string, input: CheckoutRequest): Promise<ApiResult<CheckoutResult> | null> {
    const existing = await this.db.order.findUnique({
      where: { customerId_idempotencyKey: { customerId, idempotencyKey: input.idempotencyKey } },
      include: { payment: true, reservations: { select: { expiresAt: true } } },
    });
    if (!existing) return null;
    if (existing.requestFingerprint !== fingerprint(input)) return success({ status: "CHECKOUT_CONFLICT", message: "The idempotency key was already used for different checkout details." });
    const expiry = existing.reservations.reduce<Date | null>((earliest, reservation) => !earliest || reservation.expiresAt < earliest ? reservation.expiresAt : earliest, null);
    if (!existing.payment || !expiry) return success({ status: "CHECKOUT_CONFLICT", message: "The original checkout state is incomplete." });
    return success({ status: "READY_FOR_PAYMENT", orderId: existing.id, paymentAttemptId: existing.payment.id, expiresAt: expiry.toISOString() });
  }

  async submit(customerId: string, input: CheckoutRequest): Promise<ApiResult<CheckoutResult>> {
    if (!id(customerId) || !id(input.cartId) || !id(input.deliveryAddressId) || !id(input.billingAddressId) || !id(input.deliveryMethodId) || !/^[A-Za-z0-9_-]{16,128}$/.test(input.idempotencyKey)) return failure("VALIDATION_ERROR");
    const customer = await this.db.customer.findFirst({ where: { id: customerId, status: "ACTIVE" }, select: { id: true } });
    if (!customer) return failure("UNAUTHENTICATED");
    const replay = await this.replay(customerId, input);
    if (replay) return replay;

    const expectedRevision = /^cart-([1-9][0-9]*)$/.exec(input.expectedCartRevision)?.[1];
    if (!expectedRevision) return this.cartReview(customerId);
    const orderId = randomUUID();
    const paymentAttemptId = randomUUID();
    const expiresAt = new Date(this.now().getTime() + RESERVATION_WINDOW_MS);

    try {
      return await this.db.$transaction(async tx => {
        const claimed = await tx.cart.updateMany({
          where: { id: input.cartId, customerId, status: "ACTIVE", revision: Number(expectedRevision) },
          data: { status: "CONVERTED", revision: { increment: 1 } },
        });
        if (claimed.count !== 1) throw new CheckoutAbort("CART_REVIEW");
        const cart = await tx.cart.findUnique({ where: { id: input.cartId }, include });
        if (!cart || !cart.items.length) throw new CheckoutAbort("CART_REVIEW");

        const [delivery, billing, method] = await Promise.all([
          tx.address.findFirst({ where: { id: input.deliveryAddressId, customerId, type: "DELIVERY" } }),
          tx.address.findFirst({ where: { id: input.billingAddressId, customerId, type: { in: ["DELIVERY", "BILLING"] } } }),
          tx.deliveryMethod.findFirst({ where: { id: input.deliveryMethodId, active: true } }),
        ]);
        if (!delivery || !billing || !method) throw new CheckoutAbort({ status: "CHECKOUT_CONFLICT", message: "Reload your saved addresses and delivery options." });
        if (!cart.items.every(customisationValid)) throw new CheckoutAbort({ status: "CHECKOUT_CONFLICT", message: "Review the current item customisations before checkout." });

        const currency = cart.items[0]?.variant.currency ?? method.currency;
        if (cart.items.some(item => item.variant.currency !== currency) || method.currency !== currency) throw new CheckoutAbort({ status: "CHECKOUT_CONFLICT", message: "Reload current pricing and delivery options." });
        if (input.promotionCode !== undefined && input.promotionCode.toUpperCase() !== (cart.promotion?.code ?? "")) throw new CheckoutAbort({ status: "INVALID_PROMOTION", message: "The promotion changed. Review your cart before checkout." });
        if (cart.promotion && !promotionEligible(cart.promotion, currency, this.now())) throw new CheckoutAbort({ status: "INVALID_PROMOTION", message: "The promotion is inactive, expired or ineligible." });

        const unavailable = cart.items.filter(item => !isVariantSellable(item.variant.availability, item.variant.inventory, item.quantity)).map(item => item.variantId);
        if (unavailable.length) throw new CheckoutAbort({ status: "OUT_OF_STOCK", variantIds: unavailable });
        const totals = money(cart, this.now());

        await tx.order.create({ data: {
          id: orderId,
          customerId,
          orderNumber: `PAL-${orderId.slice(0, 8).toUpperCase()}`,
          idempotencyKey: input.idempotencyKey,
          requestFingerprint: fingerprint(input),
          promotionId: cart.promotionId,
          deliveryMethodId: method.id,
          subtotalMinor: totals.subtotal,
          discountTotalMinor: totals.discount,
          deliveryChargeMinor: method.chargeMinor,
          totalMinor: totals.total + method.chargeMinor,
          currency,
          deliveryAddressSnapshot: this.snapshot(delivery),
          billingAddressSnapshot: this.snapshot(billing),
          deliveryMethodSnapshot: { id: method.id, name: method.name, chargeMinor: method.chargeMinor, currency: method.currency },
          items: { create: cart.items.map(item => ({ variantId: item.variantId, skuSnapshot: item.variant.sku, nameSnapshot: item.variant.perfume.name, unitPriceMinor: item.variant.priceMinor, quantity: item.quantity, personalisedLabel: item.personalisedLabel, engravingName: item.engravingName, giftMessage: item.giftMessage, giftPackagingId: item.giftPackagingId })) },
        } });
        for (const item of cart.items) {
          const updated = await tx.inventoryBalance.updateMany({
            where: { variantId: item.variantId, onHand: { gte: item.quantity }, reserved: { lte: (item.variant.inventory?.onHand ?? 0) - item.quantity } },
            data: { reserved: { increment: item.quantity } },
          });
          if (updated.count !== 1) throw new CheckoutAbort({ status: "OUT_OF_STOCK", variantIds: [item.variantId] });
          await tx.inventoryReservation.create({ data: { orderId, variantId: item.variantId, quantity: item.quantity, expiresAt } });
        }
        await tx.payment.create({ data: { id: paymentAttemptId, orderId, status: "PENDING" } });
        return success({ status: "READY_FOR_PAYMENT", orderId, paymentAttemptId, expiresAt: expiresAt.toISOString() });
      });
    } catch (error) {
      if (error instanceof CheckoutAbort) {
        if (error.outcome !== "CART_REVIEW") return success(error.outcome);
        const concurrentReplay = await this.replay(customerId, input);
        return concurrentReplay ?? this.cartReview(customerId);
      }
      if (isUniqueConflict(error)) {
        const concurrentReplay = await this.replay(customerId, input);
        if (concurrentReplay) return concurrentReplay;
      }
      throw error;
    }
  }

  private snapshot(address: { recipientName: string; line1: string; line2: string | null; suburb: string; state: string; postcode: string; country: string }): Record<string, string | null> {
    return { recipientName: address.recipientName, line1: address.line1, line2: address.line2, suburb: address.suburb, state: address.state, postcode: address.postcode, country: address.country };
  }
}

export function checkoutApi(service: CheckoutService, customerId: string): CheckoutApi {
  return { getDeliveryMethods: () => service.getDeliveryMethods(), submit: input => service.submit(customerId, input) };
}
