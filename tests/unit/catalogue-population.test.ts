import { describe, expect, it } from "vitest";
import {
  approvedCatalogueManifest,
  approvedCatalogueAudienceCollectionIds,
  type ApprovedCatalogueManifest,
} from "../../prisma/catalogue-data";
import {
  assertCatalogueIdentity,
  assertApprovedCatalogueManifest,
  assertCatalogueAssets,
  assertNoCatalogueRelationDrift,
  CatalogueManifestError,
  CataloguePopulationConflictError,
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
        openingInventory: { onHand: 0, reserved: 0, lowStockThreshold: 0, movementId: null, movementReference: null },
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
    expect(issues.some(issue => issue.includes("non-negative integer AUD price"))).toBe(true);
    expect(issues.some(issue => issue.includes("invalid opening inventory"))).toBe(true);
  });

  it("checks declared assets before a database connection is created", async () => {
    await expect(assertCatalogueAssets(fixture(), "/tmp/palermo-catalogue-assets-not-present"))
      .rejects.toBeInstanceOf(CatalogueManifestError);
  });

  it("validates opening movement metadata against the declared opening stock", () => {
    const valid = fixture();
    const product = valid.products[0];
    const variant = product?.variants[0];
    expect(product).toBeDefined();
    expect(variant).toBeDefined();
    if (!product || !variant) return;
    const withInventory = (
      openingInventory: typeof variant.openingInventory,
    ): ApprovedCatalogueManifest => ({
      ...valid,
      products: [{ ...product, variants: [{ ...variant, openingInventory }] }],
    });

    expect(validateApprovedCatalogueManifest(withInventory({
      ...variant.openingInventory,
      onHand: 1,
    })).some(issue => issue.includes("positive opening stock requires"))).toBe(true);
    expect(validateApprovedCatalogueManifest(withInventory({
      ...variant.openingInventory,
      movementId: id(13),
      movementReference: "test-only-opening",
    })).some(issue => issue.includes("zero opening stock cannot declare"))).toBe(true);
    const malformedIssues = validateApprovedCatalogueManifest(withInventory({
      ...variant.openingInventory,
      onHand: 1,
      movementId: "not-a-uuid",
      movementReference: "",
    }));
    expect(malformedIssues.some(issue => issue.includes("stable UUID"))).toBe(true);
    expect(malformedIssues.some(issue => issue.includes("invalid opening movement reference"))).toBe(true);
  });

  it("validates the complete official Palermo collection and sparse-media fallback", async () => {
    expect(validateApprovedCatalogueManifest(approvedCatalogueManifest)).toEqual([]);
    await expect(assertCatalogueAssets(approvedCatalogueManifest)).resolves.toBeUndefined();

    expect(approvedCatalogueManifest.products).toHaveLength(22);
    expect(new Set(approvedCatalogueManifest.products.map(product => product.id))).toHaveProperty("size", 22);

    const variants = approvedCatalogueManifest.products.flatMap(product => product.variants);
    expect(new Set(variants.map(variant => variant.sku))).toHaveProperty("size", 22);
    for (const variant of variants) {
      const expectedOnHand = variant.availability === "AVAILABLE" ? 10 : 0;
      expect(variant).toMatchObject({
        priceMinor: 3500,
        currency: "AUD",
        bottleSize: "50 mL",
        concentration: "Eau de Parfum",
      });
      expect(variant.openingInventory).toMatchObject({
  	onHand: expectedOnHand,
  	reserved: 0,
  	lowStockThreshold: 3,
  	movementReference: expectedOnHand > 0 ? `catalogue-opening-${variant.sku}` : null,
      });

if (expectedOnHand > 0) {
  expect(typeof variant.openingInventory.movementId).toBe("string");
} else {
  expect(variant.openingInventory.movementId).toBeNull();
}
    }

    const bySlug = new Map(approvedCatalogueManifest.products.map(product => [product.slug, product]));
    expect(bySlug.get("baran")?.variants[0]).toMatchObject({
      sku: "W263",
      availability: "OUT_OF_STOCK",
      openingInventory: {
        onHand: 0,
        reserved: 0,
        lowStockThreshold: 3,
        movementId: null,
        movementReference: null,
      },
    });
    expect(variants.filter(variant => variant.availability === "AVAILABLE")).toHaveLength(21);
    expect(variants.filter(variant => variant.availability === "OUT_OF_STOCK")).toHaveLength(1);
    expect(variants.filter(variant => variant.availability === "UNAVAILABLE")).toHaveLength(0);
    expect(variants.filter(variant => variant.openingInventory.onHand === 0)).toHaveLength(1);
    expect(variants.filter(variant => variant.openingInventory.onHand > 0)).toHaveLength(21);
    expect(variants
      .filter(variant => variant.openingInventory.onHand > 0)
      .every(variant => variant.openingInventory.movementId !== null
        && variant.openingInventory.movementReference !== null)).toBe(true);
    expect(
      variants.filter(variant => variant.availability === "OUT_OF_STOCK").map(variant => variant.sku),
    ).toEqual(["W263"]);
    expect(approvedCatalogueManifest.products.every(product =>
      product.images.length === 1
      && product.images[0]?.url === `/catalogue/products/${product.slug}/primary.webp`,
    )).toBe(true);
    expect([...bySlug.keys()].some(slug => slug.startsWith("demo-"))).toBe(false);

    expect(approvedCatalogueManifest.products.every(product => {
      const layers = new Set(product.notes.map(note => note.layer));
      return product.notes.length > 0 && layers.has("TOP") && layers.has("MIDDLE") && layers.has("BASE");
    })).toBe(true);

    const audienceByCollection = Object.fromEntries(
      approvedCatalogueManifest.vocabulary.collections.map(collection => [collection.id, collection.name]),
    );
    expect(Object.values(approvedCatalogueAudienceCollectionIds).map(id => audienceByCollection[id]).sort())
      .toEqual(["Men", "Unisex", "Women"]);
    expect(approvedCatalogueManifest.products.every(product => product.collectionIds.length === 1
      && Object.hasOwn(audienceByCollection, product.collectionIds[0] ?? ""))).toBe(true);
    const audienceCounts = approvedCatalogueManifest.products.reduce<Record<string, number>>((counts, product) => {
      const audience = audienceByCollection[product.collectionIds[0] ?? ""];
      if (audience) counts[audience] = (counts[audience] ?? 0) + 1;
      return counts;
    }, {});
    expect(audienceCounts).toEqual({ Women: 10, Men: 8, Unisex: 4 });
  });
});

describe("catalogue population identity safety", () => {
  const manifestId = id(100);
  const matches = (record: { naturalKey: string }): boolean => record.naturalKey === "approved-key";

  it("rejects a stable ID already assigned to a different natural key", () => {
    expect(() => assertCatalogueIdentity(
      "test identity",
      manifestId,
      { id: manifestId, naturalKey: "unrelated-existing-key" },
      null,
      matches,
    )).toThrow(CataloguePopulationConflictError);
  });

  it("rejects a natural key already assigned to a different stable ID", () => {
    expect(() => assertCatalogueIdentity(
      "test identity",
      manifestId,
      null,
      { id: id(101), naturalKey: "approved-key" },
      matches,
    )).toThrow(CataloguePopulationConflictError);
  });

  it("accepts matching stable ID and natural-key records", () => {
    const existing = { id: manifestId, naturalKey: "approved-key" };
    expect(() => assertCatalogueIdentity(
      "test identity",
      manifestId,
      existing,
      existing,
      matches,
    )).not.toThrow();
  });

  it("fails closed for every managed product relation with undeclared rows", () => {
    for (const relation of [
      "PerfumeNote",
      "PerfumeSuitability",
      "CollectionPerfume",
      "PerfumeImage",
      "PerfumeVariant",
    ]) {
      expect(() => assertNoCatalogueRelationDrift(
        "approved-product",
        relation,
        new Set(["declared"]),
        ["declared", "stale"],
      )).toThrow(CataloguePopulationConflictError);
    }
  });
});
