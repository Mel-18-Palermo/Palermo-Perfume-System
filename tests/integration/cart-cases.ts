import { describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { ids } from "../../prisma/seed-data";
import { CartService, type CartActor } from "../../src/modules/commerce/cart/service";
import type { ApiResult } from "../../src/contracts/common";

function errorCode<T>(result: ApiResult<T>): string { expect(result.ok).toBe(false); return result.ok ? "" : result.error.code; }

export function cartCases(db: PrismaClient): void {
  describe("authoritative visitor and customer carts", () => {
    const visitorKey = "cart-test-visitor-250";
    const visitor: CartActor = { kind: "VISITOR", visitorSessionKey: visitorKey };
    const customer: CartActor = { kind: "CUSTOMER", customerId: ids.otherCustomer };
    const service = new CartService(db, () => new Date("2026-09-08T00:00:00Z"));
    async function cleanup(): Promise<void> { await db.cart.deleteMany({ where: { OR: [{ visitorSessionKey: visitorKey }, { customerId: ids.otherCustomer }] } }); }
    it("creates isolated visitor and customer carts with canonical empty state", async () => {
      await cleanup();
      const guest = await service.get(visitor); const account = await service.get(customer);
      expect(guest.ok && guest.data.kind).toBe("VISITOR");
      expect(account.ok && account.data.kind).toBe("CUSTOMER");
      if (guest.ok && account.ok) { expect(guest.data.id).not.toBe(account.data.id); expect(guest.data.checkoutEligible).toBe(false); expect(guest.data.validationMessages[0]?.code).toBe("AUTHENTICATION_REQUIRED"); }
    });
    it("adds an item using current server price and does not reserve stock", async () => {
      await cleanup(); const empty = await service.get(visitor); if (!empty.ok) throw new Error("cart setup failed");
      const result = await service.addItem(visitor, { cartId: empty.data.id, expectedRevision: empty.data.revision, variantId: ids.variant, quantity: 2, customisation: { personalisedLabel: null, engravingName: null, giftMessage: null, giftPackagingId: null } });
      expect(result.ok).toBe(true); if (!result.ok) return;
      expect(result.data.items[0]).toMatchObject({ quantity: 2, unitPrice: { amountMinor: 12000, currency: "AUD" } });
      expect(result.data.pricing.subtotal.amountMinor).toBe(24000);
      expect(result.data.checkoutEligible).toBe(false);
      expect(await db.inventoryReservation.count({ where: { variantId: ids.variant } })).toBe(1);
    });
    it("merges identical customisations and keeps distinct customisations separate", async () => {
      await cleanup(); const empty = await service.get(visitor); if (!empty.ok) throw new Error("cart setup failed");
      const base = { cartId: empty.data.id, expectedRevision: empty.data.revision, variantId: ids.variant, quantity: 1, customisation: { personalisedLabel: null, engravingName: null, giftMessage: null, giftPackagingId: null } } as const;
      const first = await service.addItem(visitor, base); if (!first.ok) throw new Error("cart add failed");
      const second = await service.addItem(visitor, { ...base, expectedRevision: first.data.revision, customisation: { ...base.customisation, giftMessage: "For you" } }); if (!second.ok) throw new Error("cart add failed");
      expect(second.data.items).toHaveLength(2);
      const third = await service.addItem(visitor, { ...base, expectedRevision: second.data.revision });
      expect(third.ok).toBe(true); if (third.ok) expect(third.data.items.find(item => item.customisation.giftMessage === null)?.quantity).toBe(2);
    });
    it("rejects stale revisions, invalid quantities, unknown variants and unsupported customisations", async () => {
      await cleanup(); const empty = await service.get(visitor); if (!empty.ok) throw new Error("cart setup failed");
      const valid = { cartId: empty.data.id, expectedRevision: empty.data.revision, variantId: ids.variant, quantity: 1, customisation: { personalisedLabel: null, engravingName: null, giftMessage: null, giftPackagingId: null } };
      expect(errorCode(await service.addItem(visitor, { ...valid, quantity: 0 }))).toBe("VALIDATION_ERROR");
      expect(errorCode(await service.addItem(visitor, { ...valid, variantId: "00000000-0000-4000-8000-000000000001" }))).toBe("NOT_FOUND");
      expect(errorCode(await service.addItem(visitor, { ...valid, expectedRevision: "cart-999" }))).toBe("CONFLICT");
      expect(errorCode(await service.addItem(visitor, { ...valid, customisation: { personalisedLabel: false as never, engravingName: null, giftMessage: null, giftPackagingId: null } }))).toBe("VALIDATION_ERROR");
    });
    it("updates and removes items with optimistic concurrency", async () => {
      await cleanup(); const empty = await service.get(visitor); if (!empty.ok) throw new Error("cart setup failed");
      const added = await service.addItem(visitor, { cartId: empty.data.id, expectedRevision: empty.data.revision, variantId: ids.variant, quantity: 1, customisation: { personalisedLabel: null, engravingName: null, giftMessage: null, giftPackagingId: null } }); if (!added.ok) throw new Error("cart add failed");
      const item = added.data.items[0]; if (!item) throw new Error("cart item missing");
      const updated = await service.updateQuantity(visitor, { cartId: added.data.id, expectedRevision: added.data.revision, itemId: item.id, quantity: 3 }); if (!updated.ok) throw new Error("cart update failed");
      expect(updated.data.items[0]?.quantity).toBe(3);
      expect(errorCode(await service.removeItem(visitor, { cartId: added.data.id, expectedRevision: added.data.revision, itemId: item.id }))).toBe("CONFLICT");
      const removed = await service.removeItem(visitor, { cartId: updated.data.id, expectedRevision: updated.data.revision, itemId: item.id });
      expect(removed.ok && removed.data.items).toHaveLength(0);
    });
    it("keeps current variant pricing authoritative after an existing cart is read", async () => {
      await cleanup(); const empty = await service.get(customer); if (!empty.ok) throw new Error("cart setup failed");
      const added = await service.addItem(customer, { cartId: empty.data.id, expectedRevision: empty.data.revision, variantId: ids.variant, quantity: 1, customisation: { personalisedLabel: null, engravingName: null, giftMessage: null, giftPackagingId: null } }); if (!added.ok) throw new Error("cart add failed");
      await db.perfumeVariant.update({ where: { id: ids.variant }, data: { priceMinor: 12500 } });
      try { const current = await service.get(customer); expect(current.ok && current.data.items[0]?.unitPrice.amountMinor).toBe(12500); expect(current.ok && current.data.validationMessages.some(message => message.code === "PRICE_CHANGED")).toBe(false); } finally { await db.perfumeVariant.update({ where: { id: ids.variant }, data: { priceMinor: 12000 } }); }
    });
    it("applies and removes an active promotion through the server hook", async () => {
      await cleanup(); const empty = await service.get(customer); if (!empty.ok) throw new Error("cart setup failed");
      const promotion = await db.promotion.create({ data: { code: "CART-250", discountType: "FIXED", discountValue: 1000, currency: "AUD", active: true } });
      try {
        const applied = await service.applyPromotion(customer, { cartId: empty.data.id, expectedRevision: empty.data.revision, code: promotion.code });
        expect(applied.ok && applied.data.promotionCode).toBe("CART-250");
        if (applied.ok) { const removed = await service.applyPromotion(customer, { cartId: applied.data.id, expectedRevision: applied.data.revision, code: null }); expect(removed.ok && removed.data.promotionCode).toBeNull(); }
      } finally { await db.promotion.delete({ where: { id: promotion.id } }); }
    });
    it("never reserves stock when adding visitor or customer items", async () => {
      await cleanup(); const guest = await service.get(visitor); if (!guest.ok) throw new Error("cart setup failed");
      const before = await db.inventoryReservation.count(); await service.addItem(visitor, { cartId: guest.data.id, expectedRevision: guest.data.revision, variantId: ids.woodyVariant, quantity: 1, customisation: { personalisedLabel: null, engravingName: null, giftMessage: null, giftPackagingId: null } });
      expect(await db.inventoryReservation.count()).toBe(before);
    });
  });
}
