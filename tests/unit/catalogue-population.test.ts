import { describe, expect, it } from "vitest";
import type { ApprovedCatalogueManifest } from "../../prisma/catalogue-data";
import {
  assertApprovedCatalogueManifest,
  assertCatalogueAssets,
  CatalogueManifestError,
  validateApprovedCatalogueManifest,
} from "../../prisma/catalogue-population";

const id = (number: number): string => `37100000-0000-4000-8000-${String(number).padStart(12, "0")}`;

function fixture(): ApprovedCatalogueManifest {
  return {
    version: 1,
    vocabulary: {
      families: [{ id: id(1), name: "Test-only family", description: null, active: true }],
      notes: [{ id: id(2), name: "Test-only note", description: null, active: true }],
      intensities: [{ id: id(3), name: "Test-only intensity", active: true }],
      suitabilityTags: [{ id: id(4), category: "MOOD", value: "Test-only mood", active: true }],
      collections: [{ id: id(5), name: "Test-only collection", type: "GENERAL", active: true }],
    },
    products: [{
      id: id(10), name: "Test-only product", slug: "test-only-product", description: "Not approved catalogue content.",
      status: "ACTIVE", primaryFamilyId: id(1), intensityId: id(3), longevity: null, projection: null,
      notes: [{ noteId: id(2), layer: "TOP" }], suitabilityTagIds: [id(4)], collectionIds: [id(5)],
      images: [{ id: id(11), url: "/catalogue/products/test-only-product/primary.png", alt: "Test-only product image", sortOrder: 0 }],
      variants: [{
        id: id(12), sku: "TEST-ONLY-SKU", bottleSize: "Test-only size", concentration: "Test-only concentration",
        priceMinor: 0, currency: "AUD", availability: "OUT_OF_STOCK",
        personalisedLabel: false, engravingName: false, giftMessage: false, giftPackagingOptions: [],
        openingInventory: { onHand: 0, reserved: 0, lowStockThreshold: 0, movementId: id(13), movementReference: "test-only-opening" },
      }],
    }],
  };
}

describe("approved catalogue manifest", () => {
  it("accepts the intentional empty manifest foundation", () => {
    expect(() => assertApprovedCatalogueManifest({
      version: 1,
      vocabulary: { families: [], notes: [], intensities: [], suitabilityTags: [], collections: [] },
      products: [],
    })).not.toThrow();
  });

  it("accepts a complete, internally referenced test-only product", () => {
    expect(validateApprovedCatalogueManifest(fixture())).toEqual([]);
  });

  it("rejects duplicate identity, commercial and inventory errors before persistence", () => {
    const valid = fixture();
    const product = valid.products[0];
    const variant = product?.variants[0];
    expect(product).toBeDefined();
    expect(variant).toBeDefined();
    if (!product || !variant) return;
    const invalid = {
      ...valid,
      products: [
        { ...product, images: [], variants: [{ ...variant, priceMinor: -1, currency: "USD",
          availability: "AVAILABLE", openingInventory: { ...variant.openingInventory, reserved: 1 } }] },
        product,
      ],
    } as unknown as ApprovedCatalogueManifest;
    const issues = validateApprovedCatalogueManifest(invalid);
    expect(issues.some(issue => issue.includes("product slug must be unique"))).toBe(true);
    expect(issues.some(issue => issue.includes("SKU must be unique"))).toBe(true);
    expect(issues.some(issue => issue.includes("stable database id must be unique"))).toBe(true);
    expect(issues.some(issue => issue.includes("primary image"))).toBe(true);
    expect(issues.some(issue => issue.includes("non-negative integer AUD price"))).toBe(true);
    expect(issues.some(issue => issue.includes("invalid opening inventory"))).toBe(true);
  });

  it("checks declared assets before a database connection is created", async () => {
    await expect(assertCatalogueAssets(fixture(), "/tmp/palermo-catalogue-assets-not-present"))
      .rejects.toBeInstanceOf(CatalogueManifestError);
  });
});
