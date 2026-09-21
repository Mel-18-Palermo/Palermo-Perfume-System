export const catalogueStatuses = ["ACTIVE"] as const;
export const availabilityValues = ["AVAILABLE", "OUT_OF_STOCK", "UNAVAILABLE"] as const;
export const noteLayers = ["TOP", "MIDDLE", "BASE"] as const;
export const suitabilityCategories = ["OCCASION", "MOOD", "WEATHER", "DAYPART", "SEASON"] as const;
export const collectionTypes = ["GENERAL", "SEASONAL", "LIMITED_EDITION"] as const;

export type ApprovedCatalogueStatus = typeof catalogueStatuses[number];
export type ApprovedAvailability = typeof availabilityValues[number];
export type ApprovedNoteLayer = typeof noteLayers[number];
export type ApprovedSuitabilityCategory = typeof suitabilityCategories[number];
export type ApprovedCollectionType = typeof collectionTypes[number];

export type ApprovedNamedVocabulary = Readonly<{
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}>;

export type ApprovedIntensity = Readonly<{
  id: string;
  name: string;
  active: boolean;
}>;

export type ApprovedSuitabilityTag = Readonly<{
  id: string;
  category: ApprovedSuitabilityCategory;
  value: string;
  active: boolean;
}>;

export type ApprovedCollection = Readonly<{
  id: string;
  name: string;
  type: ApprovedCollectionType;
  active: boolean;
}>;

export type ApprovedCatalogueImage = Readonly<{
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
}>;

export type ApprovedOpeningInventory = Readonly<{
  onHand: number;
  reserved: number;
  lowStockThreshold: number;
  movementId: string;
  movementReference: string;
}>;

export type ApprovedCatalogueVariant = Readonly<{
  id: string;
  sku: string;
  bottleSize: string;
  concentration: string;
  priceMinor: number;
  currency: "AUD";
  availability: ApprovedAvailability;
  personalisedLabel: boolean;
  engravingName: boolean;
  giftMessage: boolean;
  giftPackagingOptions: readonly Readonly<{ id: string; label: string }>[];
  openingInventory: ApprovedOpeningInventory;
}>;

export type ApprovedCatalogueProduct = Readonly<{
  id: string;
  name: string;
  slug: string;
  description: string;
  status: ApprovedCatalogueStatus;
  primaryFamilyId: string;
  intensityId: string;
  longevity: string | null;
  projection: string | null;
  notes: readonly Readonly<{ noteId: string; layer: ApprovedNoteLayer }>[];
  suitabilityTagIds: readonly string[];
  collectionIds: readonly string[];
  images: readonly ApprovedCatalogueImage[];
  variants: readonly ApprovedCatalogueVariant[];
}>;

export type ApprovedCatalogueManifest = Readonly<{
  version: 1;
  vocabulary: Readonly<{
    families: readonly ApprovedNamedVocabulary[];
    notes: readonly ApprovedNamedVocabulary[];
    intensities: readonly ApprovedIntensity[];
    suitabilityTags: readonly ApprovedSuitabilityTag[];
    collections: readonly ApprovedCollection[];
  }>;
  products: readonly ApprovedCatalogueProduct[];
}>;

/**
 * Approved real catalogue facts belong here only after owner review.
 * TODO(#286): add approved vocabulary, products, variants, inventory and asset paths.
 * An empty manifest is intentional and makes the population command a validated no-op.
 */
export const approvedCatalogueManifest = {
  version: 1,
  vocabulary: {
    families: [],
    notes: [],
    intensities: [],
    suitabilityTags: [],
    collections: [],
  },
  products: [],
} as const satisfies ApprovedCatalogueManifest;
