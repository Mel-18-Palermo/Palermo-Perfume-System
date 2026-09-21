import { describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import type { ApprovedCatalogueManifest } from "../../prisma/catalogue-data";
import { populateApprovedCatalogue } from "../../prisma/catalogue-population";
import { seedId } from "../../prisma/seed-data";

const manifest: ApprovedCatalogueManifest = {
  version: 1,
  vocabulary: {
    families: [{ id: seedId(950), name: "Integration-only family", description: null, active: true }],
    notes: [{ id: seedId(951), name: "Integration-only note", description: null, active: true }],
    intensities: [{ id: seedId(952), name: "Integration-only intensity", active: true }],
    suitabilityTags: [{ id: seedId(953), category: "OCCASION", value: "Integration-only occasion", active: true }],
    collections: [{ id: seedId(954), name: "Integration-only collection", type: "GENERAL", active: true }],
  },
  products: [{
    id: seedId(955), name: "Integration-only product", slug: "integration-only-product",
    description: "Test fixture only; not approved catalogue content.", status: "ACTIVE",
    primaryFamilyId: seedId(950), intensityId: seedId(952), longevity: null, projection: null,
    notes: [{ noteId: seedId(951), layer: "BASE" }], suitabilityTagIds: [seedId(953)], collectionIds: [seedId(954)],
    images: [{ id: seedId(956), url: "/catalogue/products/integration-only-product/primary.png",
      alt: "Integration-only product image", sortOrder: 0 }],
    variants: [{
      id: seedId(957), sku: "INTEGRATION-ONLY-SKU", bottleSize: "Integration-only size",
      concentration: "Integration-only concentration", priceMinor: 0, currency: "AUD", availability: "AVAILABLE",
      personalisedLabel: false, engravingName: false, giftMessage: false, giftPackagingOptions: [],
      openingInventory: { onHand: 1, reserved: 0, lowStockThreshold: 0,
        movementId: seedId(958), movementReference: "integration-only-opening" },
    }],
  }],
};

export function cataloguePopulationCases(db: PrismaClient): void {
  describe("approved catalogue population", () => {
    it("upserts the same manifest twice without duplicates or commerce-history mutation", async () => {
      const protectedBefore = {
        customers: await db.customer.count(), orders: await db.order.count(), payments: await db.payment.count(),
        carts: await db.cart.count(), shipments: await db.shipment.count(),
      };
      const first = await populateApprovedCatalogue(db, manifest);
      const countsAfterFirst = {
        products: await db.perfume.count({ where: { id: seedId(955) } }),
        variants: await db.perfumeVariant.count({ where: { id: seedId(957) } }),
        images: await db.perfumeImage.count({ where: { id: seedId(956) } }),
        movements: await db.inventoryMovement.count({ where: { id: seedId(958) } }),
      };
      const second = await populateApprovedCatalogue(db, manifest);
      expect(first).toEqual({ products: 1, variants: 1, images: 1 });
      expect(second).toEqual(first);
      expect({
        products: await db.perfume.count({ where: { id: seedId(955) } }),
        variants: await db.perfumeVariant.count({ where: { id: seedId(957) } }),
        images: await db.perfumeImage.count({ where: { id: seedId(956) } }),
        movements: await db.inventoryMovement.count({ where: { id: seedId(958) } }),
      }).toEqual(countsAfterFirst);
      expect({
        customers: await db.customer.count(), orders: await db.order.count(), payments: await db.payment.count(),
        carts: await db.cart.count(), shipments: await db.shipment.count(),
      }).toEqual(protectedBefore);
    });
  });
}
