import { createHash, randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "../../lib/db/generated/client";
import type { AdminPerfume, PerfumeInput, VariantInput } from "../../contracts/admin";
import type { PerfumeDetail, PerfumeVariantSummary, SuitabilitySummary } from "../../contracts/catalogue";
import type { ApiResult, Option, PageRequest, Page } from "../../contracts/common";
import { failure, success } from "../../lib/api/result";

const id = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f-]{10,64}$/i.test(value);
const text = (value: unknown, max: number): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const revision = (value: unknown): number | null => typeof value === "string" && /^catalogue-[1-9][0-9]*$/.test(value) ? Number(value.slice(10)) : null;
const option = (value: { id: string; name?: string; value?: string }): Option => ({ id: value.id, label: value.name ?? value.value ?? value.id });
const money = (amountMinor: number, currency: string) => ({ amountMinor, currency });
const validOption = (value: unknown): value is Option => typeof value === "object" && value !== null
  && "id" in value && id(value.id) && "label" in value && text(value.label, 120);
const suitabilityCategories = {
  occasion: "OCCASION", mood: "MOOD", weather: "WEATHER", daypart: "DAYPART", season: "SEASON",
} as const;
const isUniqueConflict = (error: unknown): boolean => typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
class CatalogueFault extends Error {
  constructor(readonly code: "VALIDATION_ERROR" | "CONFLICT") { super(code); }
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function safeImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !/\s/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}

function perfumeFingerprint(input: PerfumeInput): string {
  return fingerprint({
    name: input.name.trim(), slug: input.slug, description: input.description.trim(),
    primaryFamilyId: input.primaryFamilyId, intensityId: input.intensity?.id ?? null,
    longevity: input.longevity?.label ?? null, projection: input.projection?.label ?? null,
    notes: [...input.notes].map(note => ({ id: note.id, layer: note.layer })).sort((a, b) => `${a.id}:${a.layer}`.localeCompare(`${b.id}:${b.layer}`)),
    suitability: Object.entries(suitabilityCategories).map(([key]) => ({ key, ids: [...input.suitability[key as keyof typeof suitabilityCategories]].map(value => value.id).sort() })),
    images: input.images.map(image => ({ id: image.id, url: image.url, alt: image.alt })),
  });
}

function variantFingerprint(perfumeId: string, input: VariantInput): string {
  return fingerprint({
    perfumeId, sku: input.sku.trim(), bottleSize: input.bottleSize.trim(), concentration: input.concentration.trim(),
    price: input.price, availability: input.availability,
    customisations: {
      personalisedLabel: input.customisations.personalisedLabel,
      engravingName: input.customisations.engravingName,
      giftMessage: input.customisations.giftMessage,
      giftPackaging: [...input.customisations.giftPackaging].map(value => value.id).sort(),
    },
  });
}

type Loaded = Prisma.PerfumeGetPayload<{ include: { primaryFamily: true; intensity: true; images: true; variants: true; notes: { include: { note: true } }; suitability: { include: { tag: true } } } }>;
const include = { primaryFamily: true, intensity: true, images: true, variants: true, notes: { include: { note: true } }, suitability: { include: { tag: true } } } as const;

function validInput(input: PerfumeInput): boolean {
  if (!input || typeof input !== "object") return false;
  if (!text(input.name, 160) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) || !text(input.description, 5000) || !id(input.primaryFamilyId)) return false;
  if (input.intensity !== null && (!id(input.intensity?.id) || !text(input.intensity?.label, 120))) return false;
  if (!Array.isArray(input.notes) || !Array.isArray(input.images)) return false;
  if (!input.suitability || Object.keys(input.suitability).sort().join(",") !== Object.keys(suitabilityCategories).sort().join(",")) return false;
  for (const value of Object.values(input.suitability) as unknown[]) {
    if (!Array.isArray(value) || value.length > 100 || !(value as unknown[]).every(validOption)) return false;
  }
  const notes = input.notes as readonly { id: unknown; label: unknown; layer: string }[];
  const images = input.images as readonly { id: unknown; url: unknown; alt: unknown }[];
  return notes.every(note => note !== null && typeof note === "object" && id(note.id) && text(note.label, 120) && ["TOP", "MIDDLE", "BASE"].includes(note.layer))
    && images.every(image => image !== null && typeof image === "object" && id(image.id) && safeImageUrl(image.url) && text(image.alt, 255));
}
function validVariant(input: VariantInput): boolean {
  return !!input && typeof input === "object"
    && !!input.price && typeof input.price === "object"
    && text(input.sku, 80) && text(input.bottleSize, 80) && text(input.concentration, 120)
    && Number.isSafeInteger(input.price.amountMinor) && input.price.amountMinor >= 0
    && /^[A-Z]{3}$/.test(input.price.currency) && ["AVAILABLE", "OUT_OF_STOCK", "UNAVAILABLE"].includes(input.availability)
    && !!input.customisations && typeof input.customisations.personalisedLabel === "boolean"
    && typeof input.customisations.engravingName === "boolean" && typeof input.customisations.giftMessage === "boolean"
    && Array.isArray(input.customisations.giftPackaging) && (input.customisations.giftPackaging as readonly { id: unknown; label: unknown }[]).every(item => !!item && typeof item === "object" && id(item.id) && text(item.label, 120));
}
function variantDto(variant: Readonly<{
  id: string; sku: string; bottleSize: string; concentration: string;
  priceMinor: number; currency: string; availability: "AVAILABLE" | "OUT_OF_STOCK" | "UNAVAILABLE";
  personalisedLabel: boolean; engravingName: boolean; giftMessage: boolean;
  giftPackagingOptions: Prisma.JsonValue;
}>): PerfumeVariantSummary {
  const giftPackaging = Array.isArray(variant.giftPackagingOptions)
    ? variant.giftPackagingOptions.filter((value): value is { id: string; label: string } =>
      value !== null && typeof value === "object" && !Array.isArray(value)
      && "id" in value && typeof value.id === "string"
      && "label" in value && typeof value.label === "string")
    : [];
  return {
    id: variant.id, sku: variant.sku, bottleSize: variant.bottleSize,
    concentration: variant.concentration, price: money(variant.priceMinor, variant.currency),
    availability: variant.availability,
    customisations: {
      personalisedLabel: variant.personalisedLabel,
      engravingName: variant.engravingName,
      giftMessage: variant.giftMessage,
      giftPackaging,
    },
  };
}
function dto(perfume: Loaded): AdminPerfume {
  const variants: PerfumeVariantSummary[] = perfume.variants.map(variantDto);
  const cheapest = [...perfume.variants].sort((a, b) => a.priceMinor - b.priceMinor)[0];
  const grouped: SuitabilitySummary = { occasion: [], mood: [], weather: [], daypart: [], season: [] };
  for (const item of perfume.suitability) (grouped[item.tag.category.toLowerCase() as keyof SuitabilitySummary] as Option[]).push(option(item.tag));
  const detail: PerfumeDetail = { id: perfume.id, slug: perfume.slug, name: perfume.name, description: perfume.description, primaryFamily: option(perfume.primaryFamily), imageUrl: perfume.images[0]?.url ?? null, priceFrom: money(cheapest?.priceMinor ?? 0, cheapest?.currency ?? "AUD"), intensity: perfume.intensity ? option(perfume.intensity) : null, notes: perfume.notes.map(item => ({ id: item.note.id, label: item.note.name, description: item.note.description, layer: item.layer })), variants, suitability: grouped, images: perfume.images.sort((a, b) => a.sortOrder - b.sortOrder).map(image => ({ id: image.id, url: image.url, alt: image.alt })), longevity: perfume.longevity ? { id: `longevity:${perfume.longevity}`, label: perfume.longevity } : null, projection: perfume.projection ? { id: `projection:${perfume.projection}`, label: perfume.projection } : null };
  return { perfume: detail, status: perfume.status, revision: `catalogue-${perfume.revision}` };
}

export class AdminCatalogueService {
  constructor(private readonly db: PrismaClient, private readonly now: () => Date = () => new Date()) {}
  private async load(idValue: string): Promise<Loaded | null> { return id(idValue) ? this.db.perfume.findUnique({ where: { id: idValue }, include }) : null; }
  private async validReferences(tx: Prisma.TransactionClient, input: PerfumeInput): Promise<boolean> {
    const family = await tx.fragranceFamily.findFirst({ where: { id: input.primaryFamilyId, active: true }, select: { id: true } });
    if (!family) return false;
    if (input.intensity) {
      const intensity = await tx.intensity.findFirst({ where: { id: input.intensity.id, active: true }, select: { id: true } });
      if (!intensity) return false;
    }
    const noteIds = [...new Set(input.notes.map(note => note.id))];
    if (new Set(input.notes.map(note => `${note.id}:${note.layer}`)).size !== input.notes.length) return false;
    if (noteIds.length && await tx.fragranceNote.count({ where: { id: { in: noteIds }, active: true } }) !== noteIds.length) return false;
    for (const [key, category] of Object.entries(suitabilityCategories)) {
      const options = input.suitability[key as keyof typeof suitabilityCategories];
      const tagIds = [...new Set(options.map(value => value.id))];
      if (tagIds.length !== options.length) return false;
      if (tagIds.length && await tx.suitabilityTag.count({ where: { id: { in: tagIds }, active: true, category } }) !== tagIds.length) return false;
    }
    return new Set(input.images.map(image => image.id)).size === input.images.length;
  }
  private async writeRelations(tx: Prisma.TransactionClient, perfumeId: string, input: PerfumeInput): Promise<void> {
    await tx.perfumeNote.deleteMany({ where: { perfumeId } }); await tx.perfumeSuitability.deleteMany({ where: { perfumeId } }); await tx.perfumeImage.deleteMany({ where: { perfumeId } });
    if (input.notes.length) await tx.perfumeNote.createMany({ data: input.notes.map(note => ({ perfumeId, noteId: note.id, layer: note.layer })) });
    const tags = Object.values(input.suitability).flatMap(values => values.map(value => ({ perfumeId, tagId: value.id })));
    if (tags.length) await tx.perfumeSuitability.createMany({ data: tags });
    if (input.images.length) await tx.perfumeImage.createMany({ data: input.images.map((image, index) => ({ id: image.id, perfumeId, url: image.url, alt: image.alt, sortOrder: index })) });
  }
  async list(request: PageRequest): Promise<ApiResult<Page<AdminPerfume>>> { const page = request.page ?? 1; const pageSize = request.pageSize ?? 20; if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) return failure("VALIDATION_ERROR"); const [rows, total] = await Promise.all([this.db.perfume.findMany({ include, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }), this.db.perfume.count()]); return success({ items: rows.map(dto), page, pageSize, hasMore: page * pageSize < total }); }
  async get(idValue: string): Promise<ApiResult<AdminPerfume>> { const row = await this.load(idValue); return row ? success(dto(row)) : failure("NOT_FOUND"); }
  async create(input: PerfumeInput & { idempotencyKey?: string }): Promise<ApiResult<AdminPerfume>> {
    if (!validInput(input) || !text(input.idempotencyKey, 128)) return failure("VALIDATION_ERROR");
    const key = input.idempotencyKey;
    const digest = perfumeFingerprint(input);
    const replay = async (): Promise<ApiResult<AdminPerfume> | null> => {
      const recorded = await this.db.catalogueCreateRequest.findUnique({ where: { operation_key: { operation: "PERFUME", key } } });
      if (!recorded) return null;
      if (recorded.fingerprint !== digest) return failure("CONFLICT");
      const row = await this.load(recorded.resultId);
      return row ? success(dto(row)) : failure("INTERNAL_ERROR");
    };
    const existing = await replay();
    if (existing) return existing;
    try {
      const row = await this.db.$transaction(async tx => {
        if (!await this.validReferences(tx, input)) throw new CatalogueFault("VALIDATION_ERROR");
        const created = await tx.perfume.create({ data: {
          id: randomUUID(), slug: input.slug, name: input.name.trim(), description: input.description.trim(),
          primaryFamilyId: input.primaryFamilyId, intensityId: input.intensity?.id ?? null,
          longevity: input.longevity?.label ?? null, projection: input.projection?.label ?? null,
        } });
        await this.writeRelations(tx, created.id, input);
        await tx.catalogueCreateRequest.create({ data: { operation: "PERFUME", key, fingerprint: digest, resultId: created.id } });
        return tx.perfume.findUniqueOrThrow({ where: { id: created.id }, include });
      });
      return success(dto(row));
    } catch (error) {
      if (error instanceof CatalogueFault) return await replay() ?? failure(error.code);
      if (isUniqueConflict(error)) return await replay() ?? failure("CONFLICT");
      throw error;
    }
  }
  async update(idValue: string, expected: string, input: PerfumeInput): Promise<ApiResult<AdminPerfume>> {
    const expectedNumber = revision(expected);
    if (!id(idValue) || expectedNumber === null || !validInput(input)) return failure("VALIDATION_ERROR");
    const current = await this.load(idValue);
    if (!current) return failure("NOT_FOUND");
    if (current.status !== "ACTIVE" || current.revision !== expectedNumber) return failure("CONFLICT");
    try {
      const row = await this.db.$transaction(async tx => {
        if (!await this.validReferences(tx, input)) throw new CatalogueFault("VALIDATION_ERROR");
        const updated = await tx.perfume.updateMany({
          where: { id: idValue, status: "ACTIVE", revision: expectedNumber },
          data: {
            slug: input.slug, name: input.name.trim(), description: input.description.trim(),
            primaryFamilyId: input.primaryFamilyId, intensityId: input.intensity?.id ?? null,
            longevity: input.longevity?.label ?? null, projection: input.projection?.label ?? null,
            revision: { increment: 1 },
          },
        });
        if (updated.count !== 1) throw new CatalogueFault("CONFLICT");
        await this.writeRelations(tx, idValue, input);
        return tx.perfume.findUniqueOrThrow({ where: { id: idValue }, include });
      });
      return success(dto(row));
    } catch (error) {
      if (error instanceof CatalogueFault) return failure(error.code);
      if (isUniqueConflict(error)) return failure("CONFLICT");
      throw error;
    }
  }
  async archive(idValue: string, expected: string): Promise<ApiResult<AdminPerfume>> { const expectedNumber = revision(expected); if (!id(idValue) || expectedNumber === null) return failure("VALIDATION_ERROR"); const updated = await this.db.perfume.updateMany({ where: { id: idValue, status: "ACTIVE", revision: expectedNumber }, data: { status: "ARCHIVED", archivedAt: this.now(), revision: { increment: 1 } } }); if (updated.count !== 1) { const exists = await this.load(idValue); return exists ? failure("CONFLICT") : failure("NOT_FOUND"); } const row = await this.load(idValue); return row ? success(dto(row)) : failure("NOT_FOUND"); }
  async createVariant(perfumeId: string, input: VariantInput & { idempotencyKey?: string }): Promise<ApiResult<PerfumeVariantSummary>> {
    if (!id(perfumeId) || !validVariant(input) || !text(input.idempotencyKey, 128)) return failure("VALIDATION_ERROR");
    const key = input.idempotencyKey;
    const digest = variantFingerprint(perfumeId, input);
    const replay = async (): Promise<ApiResult<PerfumeVariantSummary> | null> => {
      const recorded = await this.db.catalogueCreateRequest.findUnique({ where: { operation_key: { operation: "VARIANT", key } } });
      if (!recorded) return null;
      if (recorded.fingerprint !== digest) return failure("CONFLICT");
      const variant = await this.db.perfumeVariant.findUnique({ where: { id: recorded.resultId } });
      return variant ? success(variantDto(variant)) : failure("INTERNAL_ERROR");
    };
    const existing = await replay();
    if (existing) return existing;
    const perfume = await this.load(perfumeId);
    if (!perfume) return failure("NOT_FOUND");
    if (perfume.status !== "ACTIVE") return failure("CONFLICT");
    try {
      const variant = await this.db.$transaction(async tx => {
        const advanced = await tx.perfume.updateMany({
          where: { id: perfumeId, status: "ACTIVE", revision: perfume.revision },
          data: { revision: { increment: 1 } },
        });
        if (advanced.count !== 1) throw new CatalogueFault("CONFLICT");
        const created = await tx.perfumeVariant.create({ data: {
          id: randomUUID(), perfumeId, sku: input.sku.trim(), bottleSize: input.bottleSize.trim(),
          concentration: input.concentration.trim(), priceMinor: input.price.amountMinor,
          currency: input.price.currency, availability: input.availability,
          personalisedLabel: input.customisations.personalisedLabel,
          engravingName: input.customisations.engravingName,
          giftMessage: input.customisations.giftMessage,
          giftPackagingOptions: input.customisations.giftPackaging,
        } });
        await tx.catalogueCreateRequest.create({ data: { operation: "VARIANT", key, fingerprint: digest, resultId: created.id } });
        return created;
      });
      return success(variantDto(variant));
    } catch (error) {
      if (error instanceof CatalogueFault) return await replay() ?? failure(error.code);
      if (isUniqueConflict(error)) return await replay() ?? failure("CONFLICT");
      throw error;
    }
  }
  async updateVariant(perfumeId: string, variantId: string, expected: string, input: VariantInput): Promise<ApiResult<PerfumeVariantSummary>> {
    const expectedNumber = revision(expected);
    if (!id(perfumeId) || !id(variantId) || expectedNumber === null || !validVariant(input)) return failure("VALIDATION_ERROR");
    const variant = await this.db.perfumeVariant.findFirst({ where: { id: variantId, perfumeId }, include: { perfume: true } });
    if (!variant) return failure("NOT_FOUND");
    if (variant.perfume.status !== "ACTIVE" || variant.perfume.revision !== expectedNumber) return failure("CONFLICT");
    try {
      const result = await this.db.$transaction(async tx => {
        const changed = await tx.perfume.updateMany({
          where: { id: perfumeId, status: "ACTIVE", revision: expectedNumber },
          data: { revision: { increment: 1 } },
        });
        if (changed.count !== 1) throw new CatalogueFault("CONFLICT");
        return tx.perfumeVariant.update({ where: { id: variantId }, data: {
          sku: input.sku.trim(), bottleSize: input.bottleSize.trim(),
          concentration: input.concentration.trim(), priceMinor: input.price.amountMinor,
          currency: input.price.currency, availability: input.availability,
          personalisedLabel: input.customisations.personalisedLabel,
          engravingName: input.customisations.engravingName,
          giftMessage: input.customisations.giftMessage,
          giftPackagingOptions: input.customisations.giftPackaging,
        } });
      });
      return success(variantDto(result));
    } catch (error) {
      if (error instanceof CatalogueFault || isUniqueConflict(error)) return failure("CONFLICT");
      throw error;
    }
  }
}
