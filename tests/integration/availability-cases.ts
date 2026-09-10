import { describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { ids } from "../../prisma/seed-data";
import { CatalogueService } from "../../src/modules/catalogue/service";
import { CartService, type CartActor } from "../../src/modules/commerce/cart/service";
import { WishlistService } from "../../src/modules/commerce/wishlist/service";
import { availableQuantity } from "../../src/modules/commerce/availability";

export function availabilityCases(db: PrismaClient): void {
  describe("canonical inventory-backed availability", () => {
    const actor: CartActor = { kind: "CUSTOMER", customerId: ids.otherCustomer };
    const catalogue = new CatalogueService(db);
    const cart = new CartService(db, () => new Date("2026-09-08T00:00:00Z"));
    const wishlist = new WishlistService(db);

    it("keeps catalogue, cart and wishlist fail-closed across the availability matrix", async () => {
      const originalBalance = await db.inventoryBalance.findUniqueOrThrow({ where: { variantId: ids.variant } });
      const originalVariant = await db.perfumeVariant.findUniqueOrThrow({ where: { id: ids.variant } });
      await db.cart.deleteMany({ where: { customerId: ids.otherCustomer } });
      await db.wishlistItem.deleteMany({ where: { customerId: ids.otherCustomer } });
      const empty = await cart.get(actor);
      if (!empty.ok) throw new Error("cart setup failed");
      const added = await cart.addItem(actor, {
        cartId: empty.data.id,
        expectedRevision: empty.data.revision,
        variantId: ids.variant,
        quantity: 1,
        customisation: { personalisedLabel: null, engravingName: null, giftMessage: null, giftPackagingId: null },
      });
      if (!added.ok) throw new Error("cart item setup failed");
      const wished = await wishlist.add({ customerId: ids.otherCustomer }, { perfumeId: ids.perfume });
      if (!wished.ok) throw new Error("wishlist setup failed");
      const reservationCount = await db.inventoryReservation.count();

      const matrix = [
        { name: "missing balance", balance: null, lifecycle: "AVAILABLE" as const, quantity: 0, sellable: false, publicAvailability: "OUT_OF_STOCK" },
        { name: "zero on hand", balance: { onHand: 0, reserved: 0 }, lifecycle: "AVAILABLE" as const, quantity: 0, sellable: false, publicAvailability: "OUT_OF_STOCK" },
        { name: "fully reserved", balance: { onHand: 4, reserved: 4 }, lifecycle: "AVAILABLE" as const, quantity: 0, sellable: false, publicAvailability: "OUT_OF_STOCK" },
        { name: "partially reserved", balance: { onHand: 4, reserved: 3 }, lifecycle: "AVAILABLE" as const, quantity: 1, sellable: true, publicAvailability: "AVAILABLE" },
        { name: "positive available", balance: { onHand: 5, reserved: 1 }, lifecycle: "AVAILABLE" as const, quantity: 4, sellable: true, publicAvailability: "AVAILABLE" },
        { name: "unavailable lifecycle", balance: { onHand: 5, reserved: 0 }, lifecycle: "UNAVAILABLE" as const, quantity: 5, sellable: false, publicAvailability: null },
      ];

      try {
        for (const row of matrix) {
          await db.perfumeVariant.update({ where: { id: ids.variant }, data: { availability: row.lifecycle } });
          if (row.balance) {
            await db.inventoryBalance.upsert({
              where: { variantId: ids.variant },
              update: row.balance,
              create: { variantId: ids.variant, ...row.balance, lowStockThreshold: originalBalance.lowStockThreshold },
            });
          } else {
            await db.inventoryBalance.deleteMany({ where: { variantId: ids.variant } });
          }

          expect(availableQuantity(row.balance), row.name).toBe(row.quantity);
          const detail = await catalogue.get(ids.perfume);
          if (row.publicAvailability === null) {
            expect(detail.ok, row.name).toBe(false);
          } else {
            expect(detail.ok, row.name).toBe(true);
            if (detail.ok) expect(detail.data.variants.find(item => item.id === ids.variant)?.availability ?? null, row.name).toBe(row.publicAvailability);
          }

          const currentCart = await cart.get(actor);
          expect(currentCart.ok, row.name).toBe(true);
          if (!currentCart.ok) continue;
          expect(currentCart.data.checkoutEligible, row.name).toBe(row.sellable);
          expect(currentCart.data.validationMessages.some(message => message.code === (row.lifecycle === "UNAVAILABLE" ? "UNAVAILABLE" : "INSUFFICIENT_STOCK")), row.name).toBe(!row.sellable);

          const currentWishlist = await wishlist.get({ customerId: ids.otherCustomer });
          expect(currentWishlist.ok, row.name).toBe(true);
          if (currentWishlist.ok) expect(currentWishlist.data.items[0]?.available, row.name).toBe(row.sellable);
        }
        expect(await db.inventoryReservation.count()).toBe(reservationCount);
      } finally {
        await db.perfumeVariant.update({ where: { id: ids.variant }, data: { availability: originalVariant.availability } });
        await db.inventoryBalance.upsert({
          where: { variantId: ids.variant },
          update: { onHand: originalBalance.onHand, reserved: originalBalance.reserved, lowStockThreshold: originalBalance.lowStockThreshold },
          create: { variantId: ids.variant, onHand: originalBalance.onHand, reserved: originalBalance.reserved, lowStockThreshold: originalBalance.lowStockThreshold },
        });
        await db.cart.deleteMany({ where: { customerId: ids.otherCustomer } });
        await db.wishlistItem.deleteMany({ where: { customerId: ids.otherCustomer } });
      }
    });
  });
}
