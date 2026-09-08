import type { Prisma, PrismaClient } from "../../../lib/db/generated/client";
import type { CartApi, CartCustomisation, CartDto, CartMutation } from "../../../contracts/cart";
import type { ApiResult, Revision } from "../../../contracts/common";
import { failure, success } from "../../../lib/api/result";

export type CartActor = Readonly<{ kind: "VISITOR"; visitorSessionKey: string } | { kind: "CUSTOMER"; customerId: string }>;
const MAX_QUANTITY = 99;
const MAX_CUSTOMISATION_LENGTH = 100;
const include = { items: { include: { variant: { include: { perfume: { include: { primaryFamily: true } }, inventory: true } } } }, promotion: true } as const;
type LoadedCart = Prisma.CartGetPayload<{ include: typeof include }>;

function revision(value: number): Revision { return `cart-${value}`; }
function parseRevision(value: Revision): number | null { const match = /^cart-([1-9][0-9]*)$/.exec(value); return match ? Number(match[1]) : null; }
function validId(value: string): boolean { return /^[0-9a-f-]{10,64}$/i.test(value); }
function validVisitorKey(value: string): boolean { return /^[A-Za-z0-9_-]{16,128}$/.test(value); }
function validQuantity(value: number): boolean { return Number.isSafeInteger(value) && value >= 1 && value <= MAX_QUANTITY; }
function customisation(value: CartCustomisation): boolean {
  return [value.personalisedLabel, value.engravingName, value.giftMessage].every(item => item === null || (typeof item === "string" && item.trim().length <= MAX_CUSTOMISATION_LENGTH && !/[\u0000-\u001f\u007f]/.test(item)))
    && (value.giftPackagingId === null || validId(value.giftPackagingId));
}
function readOptions(value: Prisma.JsonValue): readonly string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }

export class CartService {
  constructor(private readonly db: PrismaClient, private readonly now: () => Date = () => new Date()) {}

  private where(actor: CartActor): Prisma.CartWhereInput { return actor.kind === "CUSTOMER" ? { customerId: actor.customerId, status: "ACTIVE" } : { visitorSessionKey: actor.visitorSessionKey, status: "ACTIVE" }; }
  private async load(actor: CartActor): Promise<LoadedCart | null> { return this.db.cart.findFirst({ where: this.where(actor), include }); }
  private async ensure(actor: CartActor): Promise<LoadedCart> {
    const existing = await this.load(actor); if (existing) return existing;
    return this.db.cart.create({ data: actor.kind === "CUSTOMER" ? { customerId: actor.customerId } : { visitorSessionKey: actor.visitorSessionKey }, include });
  }
  private messages(cart: LoadedCart): CartDto["validationMessages"] {
    const messages: CartDto["validationMessages"][number][] = [];
    if (cart.items.some(item => item.variant.availability === "UNAVAILABLE")) messages.push({ code: "UNAVAILABLE", itemId: cart.items.find(item => item.variant.availability === "UNAVAILABLE")?.id ?? null, message: "An item is no longer available." });
    if (cart.items.some(item => item.variant.inventory && item.variant.inventory.onHand - item.variant.inventory.reserved < item.quantity)) messages.push({ code: "INSUFFICIENT_STOCK", itemId: cart.items.find(item => item.variant.inventory && item.variant.inventory.onHand - item.variant.inventory.reserved < item.quantity)?.id ?? null, message: "Reduce the quantity before checkout." });
    if (cart.promotion && (!cart.promotion.active || (cart.promotion.activeFrom && cart.promotion.activeFrom > this.now()) || (cart.promotion.activeUntil && cart.promotion.activeUntil <= this.now()))) messages.push({ code: "INVALID_PROMOTION", itemId: null, message: "The promotion is no longer valid." });
    if (cart.customerId === null) messages.push({ code: "AUTHENTICATION_REQUIRED", itemId: null, message: "Sign in before checkout." });
    return messages;
  }
  private dto(cart: LoadedCart): CartDto {
    const items = cart.items.map(item => {
      const variant = item.variant;
      const customisation: CartCustomisation = { personalisedLabel: item.personalisedLabel, engravingName: item.engravingName, giftMessage: item.giftMessage, giftPackagingId: item.giftPackagingId };
      return { id: item.id, perfumeId: variant.perfumeId, variantId: variant.id, title: variant.perfume.name, bottleSize: variant.bottleSize, concentration: variant.concentration, quantity: item.quantity, unitPrice: { amountMinor: variant.priceMinor, currency: variant.currency }, itemTotal: { amountMinor: variant.priceMinor * item.quantity, currency: variant.currency }, customisation };
    });
    const currency = items[0]?.unitPrice.currency ?? "AUD";
    const subtotal = items.reduce((sum, item) => sum + item.itemTotal.amountMinor, 0);
    let discount = 0;
    if (cart.promotion?.active && (!cart.promotion.activeFrom || cart.promotion.activeFrom <= this.now()) && (!cart.promotion.activeUntil || cart.promotion.activeUntil > this.now())) {
      discount = cart.promotion.discountType === "FIXED" ? Math.min(subtotal, cart.promotion.discountValue) : Math.min(subtotal, Math.floor(subtotal * cart.promotion.discountValue / 10000));
    }
    const validationMessages = this.messages(cart);
    return { id: cart.id, revision: revision(cart.revision), kind: cart.customerId ? "CUSTOMER" : "VISITOR", items, pricing: { subtotal: { amountMinor: subtotal, currency }, discountTotal: { amountMinor: discount, currency }, total: { amountMinor: subtotal - discount, currency } }, promotionCode: cart.promotion?.code ?? null, checkoutEligible: Boolean(cart.customerId && items.length && validationMessages.every(message => message.code !== "UNAVAILABLE" && message.code !== "INSUFFICIENT_STOCK" && message.code !== "INVALID_PROMOTION")), validationMessages };
  }
  private validateMutation(actor: CartActor, input: CartMutation, cart: LoadedCart): ApiResult<null> {
    if (cart.id !== input.cartId || parseRevision(input.expectedRevision) !== cart.revision) return failure("CONFLICT");
    if (actor.kind === "CUSTOMER" && cart.customerId !== actor.customerId) return failure("FORBIDDEN");
    return success(null);
  }
  private async update(cart: LoadedCart, data: Prisma.CartUpdateInput): Promise<CartDto> { return this.dto(await this.db.cart.update({ where: { id: cart.id }, data: { ...data, revision: { increment: 1 } }, include })); }

  async get(actor: CartActor): Promise<ApiResult<CartDto>> { if (actor.kind === "CUSTOMER" ? !validId(actor.customerId) : !validVisitorKey(actor.visitorSessionKey)) return failure("VALIDATION_ERROR"); return success(this.dto(await this.ensure(actor))); }

  async addItem(actor: CartActor, input: CartMutation & { variantId: string; quantity: number; customisation: CartCustomisation }): Promise<ApiResult<CartDto>> {
    if (!validId(input.variantId) || !validQuantity(input.quantity) || !customisation(input.customisation)) return failure("VALIDATION_ERROR");
    const cart = await this.ensure(actor); const checked = this.validateMutation(actor, input, cart); if (!checked.ok) return checked;
    const variant = await this.db.perfumeVariant.findFirst({ where: { id: input.variantId, perfume: { status: "ACTIVE" } }, include: { perfume: true, inventory: true } });
    if (!variant || variant.availability === "UNAVAILABLE") return failure("NOT_FOUND");
    if ((input.customisation.personalisedLabel !== null && !variant.personalisedLabel) || (input.customisation.engravingName !== null && !variant.engravingName) || (input.customisation.giftMessage !== null && !variant.giftMessage) || (input.customisation.giftPackagingId !== null && !readOptions(variant.giftPackagingOptions).includes(input.customisation.giftPackagingId))) return failure("VALIDATION_ERROR");
    const existing = cart.items.find(item => item.variantId === variant.id && JSON.stringify([item.personalisedLabel, item.engravingName, item.giftMessage, item.giftPackagingId]) === JSON.stringify([input.customisation.personalisedLabel, input.customisation.engravingName, input.customisation.giftMessage, input.customisation.giftPackagingId]));
    if (existing && !validQuantity(existing.quantity + input.quantity)) return failure("VALIDATION_ERROR");
    await this.db.cartItem.upsert({ where: { id: existing?.id ?? "00000000-0000-4000-8000-000000000000" }, update: { quantity: { increment: input.quantity } }, create: { cartId: cart.id, variantId: variant.id, quantity: input.quantity, personalisedLabel: input.customisation.personalisedLabel, engravingName: input.customisation.engravingName, giftMessage: input.customisation.giftMessage, giftPackagingId: input.customisation.giftPackagingId } });
    await this.db.cart.update({ where: { id: cart.id }, data: { revision: { increment: 1 } } });
    return success(this.dto(await this.db.cart.findUniqueOrThrow({ where: { id: cart.id }, include })));
  }
  async updateQuantity(actor: CartActor, input: CartMutation & { itemId: string; quantity: number }): Promise<ApiResult<CartDto>> { if (!validId(input.itemId) || !validQuantity(input.quantity)) return failure("VALIDATION_ERROR"); const cart = await this.ensure(actor); const checked = this.validateMutation(actor, input, cart); if (!checked.ok) return checked; if (!cart.items.some(item => item.id === input.itemId)) return failure("NOT_FOUND"); return success(await this.update(cart, { items: { update: { where: { id: input.itemId }, data: { quantity: input.quantity } } } })); }
  async removeItem(actor: CartActor, input: CartMutation & { itemId: string }): Promise<ApiResult<CartDto>> { if (!validId(input.itemId)) return failure("VALIDATION_ERROR"); const cart = await this.ensure(actor); const checked = this.validateMutation(actor, input, cart); if (!checked.ok) return checked; if (!cart.items.some(item => item.id === input.itemId)) return failure("NOT_FOUND"); return success(await this.update(cart, { items: { delete: { id: input.itemId } } })); }
  async applyPromotion(actor: CartActor, input: CartMutation & { code: string | null }): Promise<ApiResult<CartDto>> { if (input.code !== null && (typeof input.code !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(input.code))) return failure("VALIDATION_ERROR"); const cart = await this.ensure(actor); const checked = this.validateMutation(actor, input, cart); if (!checked.ok) return checked; if (input.code === null) return success(await this.update(cart, { promotion: { disconnect: true } })); const promotion = await this.db.promotion.findFirst({ where: { code: input.code.toUpperCase(), active: true } }); if (!promotion || (promotion.activeFrom && promotion.activeFrom > this.now()) || (promotion.activeUntil && promotion.activeUntil <= this.now())) return failure("VALIDATION_ERROR"); return success(await this.update(cart, { promotion: { connect: { id: promotion.id } } })); }
}

export function cartApi(service: CartService, actor: CartActor): CartApi {
  return { get: () => service.get(actor), addItem: input => service.addItem(actor, input), updateQuantity: input => service.updateQuantity(actor, input), removeItem: input => service.removeItem(actor, input), applyPromotion: input => service.applyPromotion(actor, input) };
}
