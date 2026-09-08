import type { Prisma, PrismaClient } from "../../lib/db/generated/client";
import type { CatalogueFilters, CatalogueQuery, NoteAssignment, PerfumeDetail, PerfumeSummary, SuitabilitySummary } from "../../contracts/catalogue";
import type { ApiResult, Option, Page } from "../../contracts/common";
import { failure, success } from "../../lib/api/result";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const option = (id: string, label: string): Option => ({ id, label });
const money = (amountMinor: number, currency: string) => ({ amountMinor, currency });

function validIds(ids: readonly string[] | undefined): boolean { return !ids || ids.length <= 100 && ids.every(id => typeof id === "string" && /^[0-9a-f-]{10,64}$/i.test(id)); }
function queryInput(input: CatalogueQuery): { page: number; pageSize: number } | null {
  const page = input.page ?? DEFAULT_PAGE;
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE || !Number.isSafeInteger((page - 1) * pageSize)) return null;
  for (const ids of [input.note, input.family, input.collection, input.intensity, input.occasion, input.mood, input.weather]) if (!validIds(ids)) return null;
  for (const amount of [input.minPrice, input.maxPrice]) if (amount !== undefined && (!Number.isSafeInteger(amount) || amount < 0)) return null;
  if (input.minPrice !== undefined && input.maxPrice !== undefined && input.minPrice > input.maxPrice) return null;
  if (input.q !== undefined && (typeof input.q !== "string" || input.q.trim().length > 100)) return null;
  return { page, pageSize };
}

const activeVariant: Prisma.PerfumeVariantWhereInput = { availability: { in: ["AVAILABLE", "OUT_OF_STOCK"] } };
const publicPerfume: Prisma.PerfumeWhereInput = {
  status: "ACTIVE",
  variants: { some: activeVariant },
};

type LoadedPerfume = Prisma.PerfumeGetPayload<{ include: {
  primaryFamily: true; intensity: true; images: true; variants: { include: { inventory: true } }; notes: { include: { note: true } };
  suitability: { include: { tag: true } }; collections: { include: { collection: true } };
} }>;

function suitability(perfume: LoadedPerfume): SuitabilitySummary {
  const grouped = { occasion: [] as Option[], mood: [] as Option[], weather: [] as Option[], daypart: [] as Option[], season: [] as Option[] };
  for (const { tag } of perfume.suitability) {
    const key = tag.category.toLowerCase() as keyof typeof grouped;
    grouped[key]?.push(option(tag.id, tag.value));
  }
  return grouped;
}

function availability(availability: LoadedPerfume["variants"][number]["availability"], inStock: boolean): "AVAILABLE" | "OUT_OF_STOCK" | "UNAVAILABLE" {
  if (availability === "UNAVAILABLE") return "UNAVAILABLE";
  return inStock ? availability : "OUT_OF_STOCK";
}

function summary(perfume: LoadedPerfume): PerfumeSummary {
  const visible = perfume.variants.filter(variant => variant.availability !== "UNAVAILABLE");
  const cheapest = [...visible].sort((a, b) => a.priceMinor - b.priceMinor)[0];
  return {
    id: perfume.id, slug: perfume.slug, name: perfume.name,
    primaryFamily: option(perfume.primaryFamily.id, perfume.primaryFamily.name),
    imageUrl: perfume.images[0]?.url ?? null,
    priceFrom: money(cheapest?.priceMinor ?? 0, cheapest?.currency ?? "AUD"),
    intensity: perfume.intensity ? option(perfume.intensity.id, perfume.intensity.name) : null,
  };
}

function detail(perfume: LoadedPerfume): PerfumeDetail {
  const variants = perfume.variants.filter(variant => variant.availability !== "UNAVAILABLE").map(variant => ({
    id: variant.id, sku: variant.sku, bottleSize: variant.bottleSize, concentration: variant.concentration,
    price: money(variant.priceMinor, variant.currency), availability: availability(variant.availability, !variant.inventory || variant.inventory.onHand > variant.inventory.reserved),
    customisations: {
      personalisedLabel: variant.personalisedLabel, engravingName: variant.engravingName, giftMessage: variant.giftMessage,
      giftPackaging: Array.isArray(variant.giftPackagingOptions) ? variant.giftPackagingOptions.filter((value): value is { id: string; label: string } => typeof value === "object" && value !== null && "id" in value && "label" in value && typeof value.id === "string" && typeof value.label === "string").map(value => option(value.id, value.label)) : [],
    },
  }));
  const assignments: NoteAssignment[] = perfume.notes.map(({ note, layer }) => ({ id: note.id, label: note.name, description: note.description, layer }));
  return {
    ...summary(perfume), description: perfume.description, notes: assignments, variants, suitability: suitability(perfume),
    images: perfume.images.sort((a, b) => a.sortOrder - b.sortOrder).map(image => ({ id: image.id, url: image.url, alt: image.alt })),
    longevity: perfume.longevity ? option(`longevity:${perfume.longevity}`, perfume.longevity) : null,
    projection: perfume.projection ? option(`projection:${perfume.projection}`, perfume.projection) : null,
    collections: perfume.collections.filter(({ collection }) => collection.active).map(({ collection }) => option(collection.id, collection.name)),
  };
}

export class CatalogueService {
  constructor(private readonly db: PrismaClient) {}

  private include = { primaryFamily: true, intensity: true, images: true, variants: { include: { inventory: true } }, notes: { include: { note: true } }, suitability: { include: { tag: true } }, collections: { include: { collection: true } } } as const;

  async list(input: CatalogueQuery = {}): Promise<ApiResult<Page<PerfumeSummary>>> {
    const pagination = queryInput(input);
    if (!pagination) return failure("VALIDATION_ERROR");
    const q = input.q?.trim();
    const where: Prisma.PerfumeWhereInput = { ...publicPerfume };
    const filters: Prisma.PerfumeWhereInput[] = [];
    if (q) filters.push({ OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q.toLowerCase(), mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] });
    if (input.family?.length) filters.push({ primaryFamilyId: { in: [...input.family] } });
    if (input.collection?.length) filters.push({ collections: { some: { collectionId: { in: [...input.collection] }, collection: { active: true } } } });
    if (input.note?.length) filters.push({ notes: { some: { noteId: { in: [...input.note] } } } });
    if (input.intensity?.length) filters.push({ intensityId: { in: [...input.intensity] } });
    for (const [category, ids] of [["OCCASION", input.occasion], ["MOOD", input.mood], ["WEATHER", input.weather]] as const) if (ids?.length) filters.push({ suitability: { some: { tagId: { in: [...ids] }, tag: { category } } } });
    if (input.minPrice !== undefined || input.maxPrice !== undefined) filters.push({ variants: { some: { ...activeVariant, ...(input.minPrice !== undefined || input.maxPrice !== undefined ? { priceMinor: { ...(input.minPrice !== undefined ? { gte: input.minPrice } : {}), ...(input.maxPrice !== undefined ? { lte: input.maxPrice } : {}) } } : {}) } } });
    if (filters.length) where.AND = filters;
    const [records, total] = await Promise.all([
      this.db.perfume.findMany({ where, include: this.include, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (pagination.page - 1) * pagination.pageSize, take: pagination.pageSize }),
      this.db.perfume.count({ where }),
    ]);
    return success({ items: records.map(summary), page: pagination.page, pageSize: pagination.pageSize, hasMore: pagination.page * pagination.pageSize < total });
  }

  async get(id: string): Promise<ApiResult<PerfumeDetail>> {
    if (!/^[0-9a-f-]{10,64}$/i.test(id)) return failure("VALIDATION_ERROR");
    const record = await this.db.perfume.findFirst({ where: { ...publicPerfume, id }, include: this.include });
    return record ? success(detail(record)) : failure("NOT_FOUND");
  }

  async getFilters(): Promise<ApiResult<CatalogueFilters>> {
    const [notes, families, intensities, collections, tags] = await Promise.all([
      this.db.fragranceNote.findMany({ where: { active: true, perfumes: { some: { perfume: publicPerfume } } }, orderBy: { name: "asc" } }),
      this.db.fragranceFamily.findMany({ where: { active: true, perfumes: { some: publicPerfume } }, orderBy: { name: "asc" } }),
      this.db.intensity.findMany({ where: { active: true, perfumes: { some: publicPerfume } }, orderBy: { name: "asc" } }),
      this.db.collection.findMany({ where: { active: true, perfumes: { some: { perfume: publicPerfume } } }, orderBy: { name: "asc" } }),
      this.db.suitabilityTag.findMany({ where: { active: true, perfumes: { some: { perfume: publicPerfume } }, category: { in: ["OCCASION", "MOOD", "WEATHER"] } }, orderBy: [{ category: "asc" }, { value: "asc" }] }),
    ]);
    return success({ note: notes.map(note => ({ id: note.id, label: note.name, description: note.description })), family: families.map(family => option(family.id, family.name)), intensity: intensities.map(intensity => option(intensity.id, intensity.name)), collection: collections.map(collection => option(collection.id, collection.name)), occasion: tags.filter(tag => tag.category === "OCCASION").map(tag => option(tag.id, tag.value)), mood: tags.filter(tag => tag.category === "MOOD").map(tag => option(tag.id, tag.value)), weather: tags.filter(tag => tag.category === "WEATHER").map(tag => option(tag.id, tag.value)), currency: "AUD" });
  }
}
