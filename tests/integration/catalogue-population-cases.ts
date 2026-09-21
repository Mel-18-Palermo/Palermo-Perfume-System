import { describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import type {
  ApprovedCatalogueManifest,
  ApprovedCatalogueProduct,
} from "../../prisma/catalogue-data";
import {
  CataloguePopulationConflictError,
  populateApprovedCatalogue,
} from "../../prisma/catalogue-population";
import { ids, seedId } from "../../prisma/seed-data";

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
    variants: [
      {
        id: seedId(957), sku: "INTEGRATION-ONLY-SKU", bottleSize: "Integration-only size",
        concentration: "Integration-only concentration", priceMinor: 0, currency: "AUD", availability: "AVAILABLE",
        personalisedLabel: false, engravingName: false, giftMessage: false, giftPackagingOptions: [],
        openingInventory: { onHand: 1, reserved: 0, lowStockThreshold: 0,
          movementId: seedId(958), movementReference: "integration-only-opening" },
      },
      {
        id: seedId(975), sku: "INTEGRATION-ZERO-STOCK-SKU", bottleSize: "Integration-only size",
        concentration: "Integration-only concentration", priceMinor: 0, currency: "AUD", availability: "UNAVAILABLE",
        personalisedLabel: false, engravingName: false, giftMessage: false, giftPackagingOptions: [],
        openingInventory: { onHand: 0, reserved: 0, lowStockThreshold: 3,
          movementId: null, movementReference: null },
      },
    ],
  }],
};

function fixtureProduct(): ApprovedCatalogueProduct {
  const product = manifest.products[0];
  if (!product) throw new Error("Catalogue population integration fixture requires a product.");
  return product;
}

const approvedProduct = fixtureProduct();

function manifestWithProduct(
  product: ApprovedCatalogueManifest["products"][number],
): ApprovedCatalogueManifest {
  return { ...manifest, products: [product] };
}

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
        variants: await db.perfumeVariant.count({ where: { id: { in: [seedId(957), seedId(975)] } } }),
        images: await db.perfumeImage.count({ where: { id: seedId(956) } }),
        movements: await db.inventoryMovement.count({ where: { id: seedId(958) } }),
        zeroStockMovements: await db.inventoryMovement.count({ where: { variantId: seedId(975) } }),
      };
      expect(countsAfterFirst).toMatchObject({ variants: 2, movements: 1, zeroStockMovements: 0 });
      expect(await db.inventoryBalance.findUnique({ where: { variantId: seedId(975) } }))
        .toMatchObject({ onHand: 0, reserved: 0, lowStockThreshold: 3 });
      const second = await populateApprovedCatalogue(db, manifest);
      expect(first).toEqual({ products: 1, variants: 2, images: 1 });
      expect(second).toEqual(first);
      expect({
        products: await db.perfume.count({ where: { id: seedId(955) } }),
        variants: await db.perfumeVariant.count({ where: { id: { in: [seedId(957), seedId(975)] } } }),
        images: await db.perfumeImage.count({ where: { id: seedId(956) } }),
        movements: await db.inventoryMovement.count({ where: { id: seedId(958) } }),
        zeroStockMovements: await db.inventoryMovement.count({ where: { variantId: seedId(975) } }),
      }).toEqual(countsAfterFirst);
      expect(await db.inventoryBalance.count({ where: { variantId: seedId(975) } })).toBe(1);
      expect({
        customers: await db.customer.count(), orders: await db.order.count(), payments: await db.payment.count(),
        carts: await db.cart.count(), shipments: await db.shipment.count(),
      }).toEqual(protectedBefore);
    });

    it("rejects both directions of product identity collision and accepts an exact match", async () => {
      await expect(populateApprovedCatalogue(db, manifest)).resolves.toEqual({ products: 1, variants: 2, images: 1 });

      const idCollision = manifestWithProduct({
        ...approvedProduct,
        slug: "unrelated-existing-product",
        images: approvedProduct.images.map(image => ({
          ...image,
          url: "/catalogue/products/unrelated-existing-product/primary.png",
        })),
      });
      await expect(populateApprovedCatalogue(db, idCollision))
        .rejects.toBeInstanceOf(CataloguePopulationConflictError);

      const naturalKeyCollision = manifestWithProduct({ ...approvedProduct, id: seedId(959) });
      await expect(populateApprovedCatalogue(db, naturalKeyCollision))
        .rejects.toBeInstanceOf(CataloguePopulationConflictError);
    });

    it("cannot overwrite the Demo Citrus or Demo Woody identities through a manifest collision", async () => {
      const before = await db.perfume.findMany({
        where: { id: { in: [ids.perfume, ids.woodyPerfume] } },
        select: { id: true, slug: true, name: true },
        orderBy: { id: "asc" },
      });
      const collision = manifestWithProduct({
        ...approvedProduct,
        id: ids.perfume,
        slug: "demo-woody",
        images: approvedProduct.images.map(image => ({
          ...image,
          url: "/catalogue/products/demo-woody/primary.png",
        })),
      });

      await expect(populateApprovedCatalogue(db, collision))
        .rejects.toBeInstanceOf(CataloguePopulationConflictError);
      expect(await db.perfume.findMany({
        where: { id: { in: [ids.perfume, ids.woodyPerfume] } },
        select: { id: true, slug: true, name: true },
        orderBy: { id: "asc" },
      })).toEqual(before);
    });

    it("fails closed for undeclared owned product relations", async () => {
      await populateApprovedCatalogue(db, manifest);
      const cases: readonly Readonly<{
        relation: string;
        setup: () => Promise<unknown>;
        cleanup: () => Promise<unknown>;
      }>[] = [
        {
          relation: "PerfumeNote",
          setup: () => db.perfumeNote.create({
            data: { perfumeId: approvedProduct.id, noteId: ids.woodyNote, layer: "BASE" },
          }),
          cleanup: () => db.perfumeNote.delete({
            where: { perfumeId_noteId_layer: {
              perfumeId: approvedProduct.id,
              noteId: ids.woodyNote,
              layer: "BASE",
            } },
          }),
        },
        {
          relation: "PerfumeSuitability",
          setup: async () => {
            await db.suitabilityTag.create({
              data: { id: seedId(970), category: "MOOD", value: "Drift-only mood" },
            });
            return db.perfumeSuitability.create({
              data: { perfumeId: approvedProduct.id, tagId: seedId(970) },
            });
          },
          cleanup: async () => {
            await db.perfumeSuitability.delete({
              where: { perfumeId_tagId: { perfumeId: approvedProduct.id, tagId: seedId(970) } },
            });
            return db.suitabilityTag.delete({ where: { id: seedId(970) } });
          },
        },
        {
          relation: "CollectionPerfume",
          setup: async () => {
            await db.collection.create({ data: { id: seedId(971), name: "Drift-only collection" } });
            return db.collectionPerfume.create({
              data: { perfumeId: approvedProduct.id, collectionId: seedId(971) },
            });
          },
          cleanup: async () => {
            await db.collectionPerfume.delete({
              where: { collectionId_perfumeId: {
                perfumeId: approvedProduct.id,
                collectionId: seedId(971),
              } },
            });
            return db.collection.delete({ where: { id: seedId(971) } });
          },
        },
        {
          relation: "PerfumeImage",
          setup: () => db.perfumeImage.create({ data: {
            id: seedId(972),
            perfumeId: approvedProduct.id,
            url: "/catalogue/products/integration-only-product/detail-01.png",
            alt: "Drift-only image",
            sortOrder: 1,
          } }),
          cleanup: () => db.perfumeImage.delete({ where: { id: seedId(972) } }),
        },
        {
          relation: "PerfumeVariant",
          setup: () => db.perfumeVariant.create({ data: {
            id: seedId(973),
            perfumeId: approvedProduct.id,
            sku: "DRIFT-ONLY-SKU",
            bottleSize: "Test size",
            concentration: "Test concentration",
            priceMinor: 0,
            currency: "AUD",
          } }),
          cleanup: () => db.perfumeVariant.delete({ where: { id: seedId(973) } }),
        },
      ];

      for (const testCase of cases) {
        await testCase.setup();
        try {
          await expect(populateApprovedCatalogue(db, manifest))
            .rejects.toThrow(`managed ${testCase.relation} drift`);
        } finally {
          await testCase.cleanup();
        }
      }
      await expect(populateApprovedCatalogue(db, manifest)).resolves.toEqual({ products: 1, variants: 2, images: 1 });
    });

    it("preserves an existing balance and rejects a mismatched opening movement", async () => {
      await populateApprovedCatalogue(db, manifest);
      await db.inventoryBalance.update({
        where: { variantId: seedId(957) },
        data: { onHand: 7, reserved: 2, lowStockThreshold: 4 },
      });
      await populateApprovedCatalogue(db, manifest);
      expect(await db.inventoryBalance.findUnique({ where: { variantId: seedId(957) } }))
        .toMatchObject({ onHand: 7, reserved: 2, lowStockThreshold: 4 });

      const mismatch = manifestWithProduct({
        ...approvedProduct,
        variants: approvedProduct.variants.map(variant => ({
          ...variant,
          openingInventory: variant.id === seedId(957) ? {
            ...variant.openingInventory,
            onHand: 2,
          } : variant.openingInventory,
        })),
      });
      try {
        await expect(populateApprovedCatalogue(db, mismatch))
          .rejects.toThrow("does not match declared stock");
      } finally {
        await db.inventoryBalance.update({
          where: { variantId: seedId(957) },
          data: { onHand: 1, reserved: 0, lowStockThreshold: 0 },
        });
      }
    });
  });
}
