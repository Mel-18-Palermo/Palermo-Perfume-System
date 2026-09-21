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
  movementId: string | null;
  movementReference: string | null;
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
  intensityId: string | null;
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

const catalogueId = (value: number): string =>
  `27100000-0000-4000-8000-${String(value).padStart(12, "0")}`;

export const approvedCatalogueFamilyIds = {
  vanilla: catalogueId(1),
  fruity: catalogueId(2),
  amber: catalogueId(3),
  warmSpicy: catalogueId(4),
  unclassified: catalogueId(5),
  rose: catalogueId(6),
} as const;

const noteIds = {
  floralNotes: catalogueId(100),
  vanilla: catalogueId(101),
  caramel: catalogueId(102),
  sugar: catalogueId(103),
  musk: catalogueId(104),
  woodsyNotes: catalogueId(105),
  mango: catalogueId(106),
  pomegranate: catalogueId(107),
  nectarine: catalogueId(108),
  orange: catalogueId(109),
  apple: catalogueId(110),
  lotus: catalogueId(111),
  raspberry: catalogueId(112),
  waterLily: catalogueId(113),
  coconut: catalogueId(114),
  sandalwood: catalogueId(115),
  naturalMusk: catalogueId(116),
  ambergris: catalogueId(117),
  cacaoPod: catalogueId(118),
  indianOud: catalogueId(119),
  resins: catalogueId(120),
  cedarwood: catalogueId(121),
  whiteOrchid: catalogueId(122),
  tonkaBean: catalogueId(123),
  jasmine: catalogueId(124),
  cacao: catalogueId(125),
  tangerine: catalogueId(126),
  bitterOrange: catalogueId(127),
  // Reuse the deterministic demo vocabulary identity instead of creating a
  // second Bergamot record with a conflicting name.
  bergamot: "24200000-0000-4000-8000-000000000011",
  exoticFruits: catalogueId(129),
  grapefruit: catalogueId(130),
  amber: catalogueId(131),
  litchi: catalogueId(132),
  mayRose: catalogueId(133),
  patchouli: catalogueId(134),
  candiedFruits: catalogueId(135),
  whiteMusk: catalogueId(136),
  pinkPepper: catalogueId(137),
  juniper: catalogueId(138),
  elemi: catalogueId(139),
  cinnamon: catalogueId(140),
  lavender: catalogueId(141),
  sage: catalogueId(142),
  toffee: catalogueId(143),
  paprika: catalogueId(144),
  saffron: catalogueId(145),
  tobacco: catalogueId(146),
  leather: catalogueId(147),
  vetiver: catalogueId(148),
} as const;

const named = (
  id: string,
  name: string,
  description: string | null = null,
): ApprovedNamedVocabulary => ({ id, name, description, active: true });

const primaryImage = (
  id: string,
  slug: string,
  alt: string,
): ApprovedCatalogueImage => ({
  id,
  url: `/catalogue/products/${slug}/primary.webp`,
  alt,
  sortOrder: 0,
});

const standardVariant = (
  id: string,
  movementId: string | null,
  sku: string,
  availability: ApprovedAvailability,
): ApprovedCatalogueVariant => ({
  id,
  sku,
  bottleSize: "50 mL",
  concentration: "Eau de Parfum",
  priceMinor: 3500,
  currency: "AUD",
  availability,
  // Conservative application capability defaults, not Palermo product facts.
  personalisedLabel: false,
  engravingName: false,
  giftMessage: false,
  giftPackagingOptions: [],
  openingInventory: {
    movementId,
    movementReference: movementId === null ? null : `catalogue-opening-${sku}`,
    // Synthetic demo-system inventory, not a Palermo warehouse stock claim.
    onHand: availability === "AVAILABLE" ? 10 : 0,
    reserved: 0,
    lowStockThreshold: 3,
  },
});

export const approvedCatalogueManifest = {
  version: 1,
  vocabulary: {
    families: [
      named(approvedCatalogueFamilyIds.vanilla, "Vanilla"),
      named(approvedCatalogueFamilyIds.fruity, "Fruity"),
      named(approvedCatalogueFamilyIds.amber, "Amber"),
      named(approvedCatalogueFamilyIds.warmSpicy, "Warm Spicy"),
      named(
        approvedCatalogueFamilyIds.unclassified,
        "Unclassified",
        "Project taxonomy used when Palermo has not published an accord or family.",
      ),
      named(approvedCatalogueFamilyIds.rose, "Rose"),
    ],
    notes: [
      named(noteIds.floralNotes, "Floral Notes"),
      named(noteIds.vanilla, "Vanilla"),
      named(noteIds.caramel, "Caramel"),
      named(noteIds.sugar, "Sugar"),
      named(noteIds.musk, "Musk"),
      named(noteIds.woodsyNotes, "Woodsy Notes"),
      named(noteIds.mango, "Mango"),
      named(noteIds.pomegranate, "Pomegranate"),
      named(noteIds.nectarine, "Nectarine"),
      named(noteIds.orange, "Orange"),
      named(noteIds.apple, "Apple"),
      named(noteIds.lotus, "Lotus"),
      named(noteIds.raspberry, "Raspberry"),
      named(noteIds.waterLily, "Water Lily"),
      named(noteIds.coconut, "Coconut"),
      named(noteIds.sandalwood, "Sandalwood"),
      named(noteIds.naturalMusk, "Natural Musk"),
      named(noteIds.ambergris, "Ambergris"),
      named(noteIds.cacaoPod, "Cacao Pod"),
      named(noteIds.indianOud, "Indian Oud"),
      named(noteIds.resins, "Resins"),
      named(noteIds.cedarwood, "Cedarwood"),
      named(noteIds.whiteOrchid, "White Orchid"),
      named(noteIds.tonkaBean, "Tonka Bean"),
      named(noteIds.jasmine, "Jasmine"),
      named(noteIds.cacao, "Cacao"),
      named(noteIds.tangerine, "Tangerine"),
      named(noteIds.bitterOrange, "Bitter Orange"),
      named(noteIds.bergamot, "Bergamot"),
      named(noteIds.exoticFruits, "Exotic Fruits"),
      named(noteIds.grapefruit, "Grapefruit"),
      named(noteIds.amber, "Amber"),
      named(noteIds.litchi, "Litchi"),
      named(noteIds.mayRose, "May Rose"),
      named(noteIds.patchouli, "Patchouli"),
      named(noteIds.candiedFruits, "Candied Fruits"),
      named(noteIds.whiteMusk, "White Musk"),
      named(noteIds.pinkPepper, "Pink Pepper"),
      named(noteIds.juniper, "Juniper"),
      named(noteIds.elemi, "Elemi"),
      named(noteIds.cinnamon, "Cinnamon"),
      named(noteIds.lavender, "Lavender"),
      named(noteIds.sage, "Sage"),
      named(noteIds.toffee, "Toffee"),
      named(noteIds.paprika, "Paprika"),
      named(noteIds.saffron, "Saffron"),
      named(noteIds.tobacco, "Tobacco"),
      named(noteIds.leather, "Leather"),
      named(noteIds.vetiver, "Vetiver"),
    ],
    intensities: [],
    suitabilityTags: [],
    collections: [],
  },
  products: [
    {
      id: catalogueId(1000),
      name: "Golden Dust",
      slug: "golden-dust",
      description:
        "Palermo's Golden Dust interpretation brings its published accords together in a 50 mL Eau de Parfum.",
      status: "ACTIVE",
      primaryFamilyId: approvedCatalogueFamilyIds.vanilla,
      intensityId: null,
      longevity: null,
      projection: null,
      notes: [
        { noteId: noteIds.floralNotes, layer: "TOP" },
        { noteId: noteIds.floralNotes, layer: "MIDDLE" },
        { noteId: noteIds.vanilla, layer: "BASE" },
        { noteId: noteIds.caramel, layer: "BASE" },
        { noteId: noteIds.sugar, layer: "BASE" },
        { noteId: noteIds.musk, layer: "BASE" },
        { noteId: noteIds.woodsyNotes, layer: "BASE" },
      ],
      suitabilityTagIds: [],
      collectionIds: [],
      images: [
        primaryImage(
          catalogueId(1002),
          "golden-dust",
          "Palermo Golden Dust Eau de Parfum product bottle",
        ),
      ],
      variants: [standardVariant(catalogueId(1001), catalogueId(1003), "W222", "AVAILABLE")],
    },
    {
      id: catalogueId(1010),
      name: "Candy",
      slug: "candy",
      description:
        "Palermo's Candy interpretation brings its published accords together in a 50 mL Eau de Parfum.",
      status: "ACTIVE",
      primaryFamilyId: approvedCatalogueFamilyIds.fruity,
      intensityId: null,
      longevity: null,
      projection: null,
      notes: [
        { noteId: noteIds.mango, layer: "TOP" },
        { noteId: noteIds.pomegranate, layer: "TOP" },
        { noteId: noteIds.nectarine, layer: "TOP" },
        { noteId: noteIds.orange, layer: "TOP" },
        { noteId: noteIds.apple, layer: "MIDDLE" },
        { noteId: noteIds.lotus, layer: "MIDDLE" },
        { noteId: noteIds.raspberry, layer: "MIDDLE" },
        { noteId: noteIds.waterLily, layer: "MIDDLE" },
        { noteId: noteIds.coconut, layer: "BASE" },
        { noteId: noteIds.sandalwood, layer: "BASE" },
        { noteId: noteIds.musk, layer: "BASE" },
      ],
      suitabilityTagIds: [],
      collectionIds: [],
      images: [
        primaryImage(catalogueId(1012), "candy", "Palermo Candy Eau de Parfum product bottle"),
      ],
      variants: [standardVariant(catalogueId(1011), catalogueId(1013), "W023", "AVAILABLE")],
    },
    {
      id: catalogueId(1020),
      name: "Saphire Chocolate",
      slug: "saphire-chocolate",
      description:
        "Palermo's Saphire Chocolate interpretation brings its published accords together in a 50 mL Eau de Parfum.",
      status: "ACTIVE",
      primaryFamilyId: approvedCatalogueFamilyIds.amber,
      intensityId: null,
      longevity: null,
      projection: null,
      notes: [
        { noteId: noteIds.naturalMusk, layer: "TOP" },
        { noteId: noteIds.ambergris, layer: "TOP" },
        { noteId: noteIds.cacaoPod, layer: "MIDDLE" },
        { noteId: noteIds.indianOud, layer: "MIDDLE" },
        { noteId: noteIds.resins, layer: "BASE" },
        { noteId: noteIds.cedarwood, layer: "BASE" },
      ],
      suitabilityTagIds: [],
      collectionIds: [],
      images: [
        primaryImage(
          catalogueId(1022),
          "saphire-chocolate",
          "Palermo Saphire Chocolate Eau de Parfum product bottle",
        ),
      ],
      variants: [standardVariant(catalogueId(1021), catalogueId(1023), "W223", "AVAILABLE")],
    },
    {
      id: catalogueId(1030),
      name: "Vanilla",
      slug: "vanilla",
      description:
        "Palermo's Vanilla interpretation brings its published accords together in a 50 mL Eau de Parfum.",
      status: "ACTIVE",
      primaryFamilyId: approvedCatalogueFamilyIds.vanilla,
      intensityId: null,
      longevity: null,
      projection: null,
      notes: [
        { noteId: noteIds.vanilla, layer: "TOP" },
        { noteId: noteIds.whiteOrchid, layer: "TOP" },
        { noteId: noteIds.vanilla, layer: "MIDDLE" },
        { noteId: noteIds.sugar, layer: "MIDDLE" },
        { noteId: noteIds.coconut, layer: "MIDDLE" },
        { noteId: noteIds.tonkaBean, layer: "MIDDLE" },
        { noteId: noteIds.jasmine, layer: "MIDDLE" },
        { noteId: noteIds.vanilla, layer: "BASE" },
        { noteId: noteIds.sandalwood, layer: "BASE" },
        { noteId: noteIds.cacao, layer: "BASE" },
      ],
      suitabilityTagIds: [],
      collectionIds: [],
      images: [
        primaryImage(catalogueId(1032), "vanilla", "Palermo Vanilla Eau de Parfum product bottle"),
      ],
      variants: [standardVariant(catalogueId(1031), catalogueId(1033), "W787", "AVAILABLE")],
    },
    {
      id: catalogueId(1040),
      name: "Candy Summer",
      slug: "candy-summer",
      description:
        "Palermo's Candy Summer is presented as a 50 mL Eau de Parfum with published citrus, fruit, vanilla, and woody notes.",
      status: "ACTIVE",
      primaryFamilyId: approvedCatalogueFamilyIds.vanilla,
      intensityId: null,
      longevity: null,
      projection: null,
      notes: [
        { noteId: noteIds.tangerine, layer: "TOP" },
        { noteId: noteIds.bitterOrange, layer: "TOP" },
        { noteId: noteIds.bergamot, layer: "TOP" },
        { noteId: noteIds.exoticFruits, layer: "MIDDLE" },
        { noteId: noteIds.grapefruit, layer: "MIDDLE" },
        { noteId: noteIds.vanilla, layer: "BASE" },
        { noteId: noteIds.sandalwood, layer: "BASE" },
        { noteId: noteIds.musk, layer: "BASE" },
        { noteId: noteIds.amber, layer: "BASE" },
      ],
      suitabilityTagIds: [],
      collectionIds: [],
      images: [
        primaryImage(
          catalogueId(1042),
          "candy-summer",
          "Palermo Candy Summer Eau de Parfum product bottle",
        ),
      ],
      variants: [standardVariant(catalogueId(1041), catalogueId(1043), "W348", "AVAILABLE")],
    },
    {
      id: catalogueId(1050),
      name: "Musk Rose",
      slug: "musk-rose",
      description:
        "Palermo's Musk Rose is presented as a 50 mL Eau de Parfum with published fruit, rose, patchouli, and musk notes.",
      status: "ACTIVE",
      primaryFamilyId: approvedCatalogueFamilyIds.fruity,
      intensityId: null,
      longevity: null,
      projection: null,
      notes: [
        { noteId: noteIds.litchi, layer: "TOP" },
        { noteId: noteIds.mayRose, layer: "MIDDLE" },
        { noteId: noteIds.patchouli, layer: "MIDDLE" },
        { noteId: noteIds.candiedFruits, layer: "MIDDLE" },
        { noteId: noteIds.whiteMusk, layer: "BASE" },
      ],
      suitabilityTagIds: [],
      collectionIds: [],
      images: [
        primaryImage(
          catalogueId(1052),
          "musk-rose",
          "Palermo Musk Rose Eau de Parfum product bottle",
        ),
      ],
      variants: [standardVariant(catalogueId(1051), catalogueId(1053), "M314", "AVAILABLE")],
    },
    {
      id: catalogueId(1060),
      name: "Palermo Gold",
      slug: "palermo-gold",
      description:
        "A bold sweet and spicy fragrance presented by Palermo Perfumes with vanilla, amber, and spice accords.",
      status: "ACTIVE",
      primaryFamilyId: approvedCatalogueFamilyIds.warmSpicy,
      intensityId: null,
      longevity: null,
      projection: null,
      notes: [
        { noteId: noteIds.pinkPepper, layer: "TOP" },
        { noteId: noteIds.juniper, layer: "TOP" },
        { noteId: noteIds.bergamot, layer: "TOP" },
        { noteId: noteIds.grapefruit, layer: "TOP" },
        { noteId: noteIds.elemi, layer: "TOP" },
        { noteId: noteIds.cinnamon, layer: "MIDDLE" },
        { noteId: noteIds.lavender, layer: "MIDDLE" },
        { noteId: noteIds.sage, layer: "MIDDLE" },
        { noteId: noteIds.toffee, layer: "MIDDLE" },
        { noteId: noteIds.paprika, layer: "MIDDLE" },
        { noteId: noteIds.saffron, layer: "MIDDLE" },
        { noteId: noteIds.vanilla, layer: "BASE" },
        { noteId: noteIds.tonkaBean, layer: "BASE" },
        { noteId: noteIds.amber, layer: "BASE" },
        { noteId: noteIds.tobacco, layer: "BASE" },
        { noteId: noteIds.leather, layer: "BASE" },
        { noteId: noteIds.vetiver, layer: "BASE" },
      ],
      suitabilityTagIds: [],
      collectionIds: [],
      images: [
        primaryImage(
          catalogueId(1062),
          "palermo-gold",
          "Palermo Gold Eau de Parfum product bottle",
        ),
      ],
      variants: [standardVariant(catalogueId(1061), catalogueId(1063), "M804", "AVAILABLE")],
    },
    {
      id: catalogueId(1070),
      name: "Palermo Sport",
      slug: "palermo-sport",
      description:
        "Palermo Sport is presented by Palermo Perfumes as a 50 mL Eau de Parfum; its fragrance notes are not currently published.",
      status: "ACTIVE",
      primaryFamilyId: approvedCatalogueFamilyIds.unclassified,
      intensityId: null,
      longevity: null,
      projection: null,
      notes: [],
      suitabilityTagIds: [],
      collectionIds: [],
      images: [
        primaryImage(
          catalogueId(1072),
          "palermo-sport",
          "Palermo Sport Eau de Parfum product bottle",
        ),
      ],
      variants: [standardVariant(catalogueId(1071), catalogueId(1073), "M198", "AVAILABLE")],
    },
    {
      id: catalogueId(1080),
      name: "Palermo Woman",
      slug: "palermo-woman",
      description:
        "Palermo Woman is presented by Palermo Perfumes as a 50 mL Eau de Parfum; its fragrance notes are not currently published.",
      status: "ACTIVE",
      primaryFamilyId: approvedCatalogueFamilyIds.unclassified,
      intensityId: null,
      longevity: null,
      projection: null,
      notes: [],
      suitabilityTagIds: [],
      collectionIds: [],
      images: [
        primaryImage(
          catalogueId(1082),
          "palermo-woman",
          "Palermo Woman Eau de Parfum product bottle",
        ),
      ],
      variants: [standardVariant(catalogueId(1081), catalogueId(1083), "W317", "AVAILABLE")],
    },
    {
      id: catalogueId(1090),
      name: "Baran",
      slug: "baran",
      description:
        "Palermo's Baran interpretation is presented as a 50 mL Eau de Parfum with published rose, floral, fresh, and fruity accords; its fragrance notes are not currently published.",
      status: "ACTIVE",
      primaryFamilyId: approvedCatalogueFamilyIds.rose,
      intensityId: null,
      longevity: null,
      projection: null,
      notes: [],
      suitabilityTagIds: [],
      collectionIds: [],
      images: [
        primaryImage(catalogueId(1092), "baran", "Palermo Baran Eau de Parfum product bottle"),
      ],
      variants: [standardVariant(catalogueId(1091), null, "W263", "UNAVAILABLE")],
    },
  ],
} as const satisfies ApprovedCatalogueManifest;
