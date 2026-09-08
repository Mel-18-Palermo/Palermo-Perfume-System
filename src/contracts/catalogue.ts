import type { Endpoint, EntityId, MoneyValue, Option, Page, PageRequest } from "./common";

/** Vocabulary IDs come from catalogue metadata, not hard-coded UI enums. D-015–D-025. */
export type FragranceNoteSummary = Option & Readonly<{ description: string | null }>;
export type NoteAssignment = FragranceNoteSummary & Readonly<{ layer: "TOP" | "MIDDLE" | "BASE" }>;
export type SuitabilitySummary = Readonly<{
  occasion: readonly Option[]; mood: readonly Option[]; weather: readonly Option[];
  daypart: readonly Option[]; season: readonly Option[];
}>;
export type CustomisationCapabilities = Readonly<{
  personalisedLabel: boolean; engravingName: boolean; giftMessage: boolean;
  giftPackaging: readonly Option[];
}>;
export type PerfumeVariantSummary = Readonly<{
  id: EntityId; sku: string; bottleSize: string; concentration: string;
  price: MoneyValue; availability: "AVAILABLE" | "OUT_OF_STOCK" | "UNAVAILABLE";
  customisations: CustomisationCapabilities;
}>;
export type PerfumeImageSummary = Readonly<{ id: EntityId; url: string; alt: string }>;
export type PerfumeSummary = Readonly<{
  id: EntityId; slug: string; name: string; primaryFamily: Option;
  imageUrl: string | null; priceFrom: MoneyValue; intensity: Option | null;
}>;
export type PerfumeDetail = PerfumeSummary & Readonly<{
  description: string; notes: readonly NoteAssignment[];
  variants: readonly PerfumeVariantSummary[]; suitability: SuitabilitySummary;
  images: readonly PerfumeImageSummary[]; longevity: Option | null; projection: Option | null;
  collections?: readonly Option[];
}>;
/** OR within each list, AND across lists. Prices are minor units; no brand or sort filter. */
export type CatalogueQuery = PageRequest & Readonly<{
  q?: string; note?: readonly EntityId[]; family?: readonly EntityId[];
  collection?: readonly EntityId[];
  minPrice?: number; maxPrice?: number; intensity?: readonly EntityId[];
  occasion?: readonly EntityId[]; mood?: readonly EntityId[]; weather?: readonly EntityId[];
}>;
export type CatalogueFilters = Readonly<{
  note: readonly FragranceNoteSummary[]; family: readonly Option[]; intensity: readonly Option[];
  collection?: readonly Option[];
  occasion: readonly Option[]; mood: readonly Option[]; weather: readonly Option[];
  currency: string;
}>;
export type CatalogueApi = Readonly<{
  list: Endpoint<CatalogueQuery, Page<PerfumeSummary>>;
  get: Endpoint<{ readonly id: EntityId }, PerfumeDetail>;
  getFilters: Endpoint<void, CatalogueFilters>;
}>;
