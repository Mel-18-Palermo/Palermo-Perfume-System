import { access } from "node:fs/promises";
import { resolve } from "node:path";
import type { Prisma, PrismaClient } from "../src/lib/db/generated/client";
import {
  availabilityValues,
  collectionTypes,
  noteLayers,
  suitabilityCategories,
  type ApprovedCatalogueManifest,
  type ApprovedCatalogueProduct,
} from "./catalogue-data";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const assetNamePattern = /^(?:primary|detail-[0-9]{2})\.(?:png|webp)$/;

export class CatalogueManifestError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Approved catalogue manifest is invalid:\n- ${issues.join("\n- ")}`);
  }
}

export class CataloguePopulationConflictError extends Error {
  constructor(label: string) {
    super(`Catalogue population conflict: ${label}.`);
  }
}

function text(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.trim() === value && value.length > 0 && value.length <= maximum;
}

function integer(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function addDuplicateIssues(label: string, values: readonly string[], issues: string[]): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) issues.push(`${label} must be unique: ${value}.`);
    seen.add(value);
  }
}

function productAssetPrefix(product: ApprovedCatalogueProduct): string {
  return `/catalogue/products/${product.slug}/`;
}

export function validateApprovedCatalogueManifest(manifest: ApprovedCatalogueManifest): readonly string[] {
  const issues: string[] = [];
  if (manifest.version !== 1) issues.push("Manifest version must be 1.");

  const databaseIds: string[] = [];
  const registerId = (label: string, value: string): void => {
    if (!uuidPattern.test(value)) issues.push(`${label} must use a stable UUID.`);
    databaseIds.push(value);
  };

  for (const [label, records] of [
    ["family", manifest.vocabulary.families],
    ["note", manifest.vocabulary.notes],
  ] as const) {
    addDuplicateIssues(`${label} name`, records.map(record => record.name), issues);
    for (const record of records) {
      registerId(`${label} ${record.name || "<unnamed>"} id`, record.id);
      if (!text(record.name, 120)) issues.push(`${label} names must be trimmed and 1-120 characters.`);
      if (record.description !== null && !text(record.description, 2_000)) {
        issues.push(`${label} descriptions must be null or trimmed and 1-2000 characters.`);
      }
    }
  }

  addDuplicateIssues("intensity name", manifest.vocabulary.intensities.map(record => record.name), issues);
  for (const intensity of manifest.vocabulary.intensities) {
    registerId(`intensity ${intensity.name || "<unnamed>"} id`, intensity.id);
    if (!text(intensity.name, 120)) issues.push("Intensity names must be trimmed and 1-120 characters.");
  }

  addDuplicateIssues("suitability category/value", manifest.vocabulary.suitabilityTags
    .map(record => `${record.category}:${record.value}`), issues);
  for (const tag of manifest.vocabulary.suitabilityTags) {
    registerId(`suitability ${tag.category}:${tag.value || "<unnamed>"} id`, tag.id);
    if (!suitabilityCategories.includes(tag.category) || !text(tag.value, 120)) {
      issues.push("Suitability tags require a valid category and a trimmed 1-120 character value.");
    }
  }

  addDuplicateIssues("collection name", manifest.vocabulary.collections.map(record => record.name), issues);
  for (const collection of manifest.vocabulary.collections) {
    registerId(`collection ${collection.name || "<unnamed>"} id`, collection.id);
    if (!collectionTypes.includes(collection.type) || !text(collection.name, 160)) {
      issues.push("Collections require a valid type and a trimmed 1-160 character name.");
    }
  }

  const familyIds = new Set(manifest.vocabulary.families.map(record => record.id));
  const noteIds = new Set(manifest.vocabulary.notes.map(record => record.id));
  const intensityIds = new Set(manifest.vocabulary.intensities.map(record => record.id));
  const suitabilityIds = new Set(manifest.vocabulary.suitabilityTags.map(record => record.id));
  const collectionIds = new Set(manifest.vocabulary.collections.map(record => record.id));
  addDuplicateIssues("product slug", manifest.products.map(product => product.slug), issues);
  addDuplicateIssues("SKU", manifest.products.flatMap(product => product.variants.map(variant => variant.sku)), issues);
  addDuplicateIssues("opening movement reference", manifest.products
    .flatMap(product => product.variants.map(variant => variant.openingInventory.movementReference)), issues);
  addDuplicateIssues("image URL", manifest.products.flatMap(product => product.images.map(image => image.url)), issues);

  for (const product of manifest.products) {
    registerId(`product ${product.slug || "<unnamed>"} id`, product.id);
    if (!text(product.name, 160) || !slugPattern.test(product.slug) || !text(product.description, 5_000)) {
      issues.push(`Product ${product.id} requires a name, kebab-case slug and trimmed description.`);
    }
    if (product.status !== "ACTIVE") issues.push(`Product ${product.slug} must use ACTIVE status.`);
    if (!familyIds.has(product.primaryFamilyId)) issues.push(`Product ${product.slug} references an unknown family.`);
    if (product.intensityId !== null && !intensityIds.has(product.intensityId)) {
      issues.push(`Product ${product.slug} references an unknown intensity.`);
    }
    if (product.longevity !== null && !text(product.longevity, 120)) issues.push(`Product ${product.slug} has invalid longevity.`);
    if (product.projection !== null && !text(product.projection, 120)) issues.push(`Product ${product.slug} has invalid projection.`);

    addDuplicateIssues(`product ${product.slug} note assignment`, product.notes.map(note => `${note.noteId}:${note.layer}`), issues);
    for (const note of product.notes) {
      if (!noteIds.has(note.noteId) || !noteLayers.includes(note.layer)) {
        issues.push(`Product ${product.slug} has an invalid note reference or layer.`);
      }
    }
    addDuplicateIssues(`product ${product.slug} suitability reference`, product.suitabilityTagIds, issues);
    for (const tagId of product.suitabilityTagIds) {
      if (!suitabilityIds.has(tagId)) issues.push(`Product ${product.slug} references an unknown suitability tag.`);
    }
    addDuplicateIssues(`product ${product.slug} collection reference`, product.collectionIds, issues);
    for (const collectionId of product.collectionIds) {
      if (!collectionIds.has(collectionId)) issues.push(`Product ${product.slug} references an unknown collection.`);
    }

    if (product.images.length === 0 || !product.images.some(image => image.sortOrder === 0)) {
      issues.push(`Active product ${product.slug} requires a primary image with sortOrder 0.`);
    }
    addDuplicateIssues(`product ${product.slug} image sortOrder`, product.images.map(image => String(image.sortOrder)), issues);
    for (const image of product.images) {
      registerId(`product ${product.slug} image id`, image.id);
      const prefix = productAssetPrefix(product);
      const filename = image.url.startsWith(prefix) ? image.url.slice(prefix.length) : "";
      if (!integer(image.sortOrder) || !text(image.alt, 255) || !assetNamePattern.test(filename)) {
        issues.push(
          `Product ${product.slug} has an invalid image; use ${prefix}primary.webp or detail-NN.webp (PNG is also supported).`,
        );
      }
      if (image.sortOrder === 0 && !/^primary\.(?:png|webp)$/.test(filename)) {
        issues.push(`Product ${product.slug} primary image must be ${prefix}primary.webp or primary.png.`);
      }
    }

    if (product.variants.length === 0) issues.push(`Active product ${product.slug} requires at least one variant.`);
    for (const variant of product.variants) {
      registerId(`variant ${variant.sku || "<unnamed>"} id`, variant.id);
      registerId(`variant ${variant.sku || "<unnamed>"} opening movement id`, variant.openingInventory.movementId);
      if (!text(variant.sku, 80) || !text(variant.bottleSize, 80) || !text(variant.concentration, 120)) {
        issues.push(`Product ${product.slug} has an invalid variant identity or presentation.`);
      }
      if (!integer(variant.priceMinor) || variant.currency !== "AUD" || !availabilityValues.includes(variant.availability)) {
        issues.push(`Variant ${variant.sku} requires a non-negative integer AUD price and valid availability.`);
      }
      addDuplicateIssues(`variant ${variant.sku} gift packaging id`, variant.giftPackagingOptions.map(option => option.id), issues);
      for (const option of variant.giftPackagingOptions) {
        if (!uuidPattern.test(option.id) || !text(option.label, 120)) issues.push(`Variant ${variant.sku} has invalid gift packaging.`);
      }
      const inventory = variant.openingInventory;
      if (!integer(inventory.onHand) || !integer(inventory.reserved) || !integer(inventory.lowStockThreshold)
        || inventory.reserved > inventory.onHand || !text(inventory.movementReference, 160)) {
        issues.push(`Variant ${variant.sku} has invalid opening inventory.`);
      }
      const available = inventory.onHand - inventory.reserved;
      if (variant.availability === "AVAILABLE" && available === 0) {
        issues.push(`Available variant ${variant.sku} requires available opening stock.`);
      }
      if (variant.availability === "OUT_OF_STOCK" && available !== 0) {
        issues.push(`Out-of-stock variant ${variant.sku} cannot have available opening stock.`);
      }
    }
  }

  addDuplicateIssues("stable database id", databaseIds, issues);
  return issues;
}

export function assertApprovedCatalogueManifest(manifest: ApprovedCatalogueManifest): void {
  const issues = validateApprovedCatalogueManifest(manifest);
  if (issues.length) throw new CatalogueManifestError(issues);
}

export async function assertCatalogueAssets(manifest: ApprovedCatalogueManifest, root = process.cwd()): Promise<void> {
  assertApprovedCatalogueManifest(manifest);
  const missing: string[] = [];
  for (const image of manifest.products.flatMap(product => product.images)) {
    try { await access(resolve(root, "public", image.url.slice(1))); } catch { missing.push(image.url); }
  }
  if (missing.length) throw new CatalogueManifestError(missing.map(path => `Missing catalogue asset: ${path}.`));
}

type IdentityRecord = Readonly<{ id: string }>;

function isIdentityRecordArray<T extends IdentityRecord>(
  value: T | readonly T[],
): value is readonly T[] {
  return Array.isArray(value);
}

export function assertCatalogueIdentity<T extends IdentityRecord>(
  label: string,
  manifestId: string,
  existingById: T | null,
  existingByNaturalKey: T | readonly T[] | null,
  matchesDeclaredIdentity: (record: T) => boolean,
): void {
  if (existingById && (existingById.id !== manifestId || !matchesDeclaredIdentity(existingById))) {
    throw new CataloguePopulationConflictError(`${label} stable ID has a different identity`);
  }
  const naturalKeyRows = existingByNaturalKey === null
    ? []
    : isIdentityRecordArray(existingByNaturalKey) ? existingByNaturalKey : [existingByNaturalKey];
  if (naturalKeyRows.some(record => record.id !== manifestId || !matchesDeclaredIdentity(record))) {
    throw new CataloguePopulationConflictError(`${label} natural key has a different identity`);
  }
}

export function assertNoCatalogueRelationDrift(
  productSlug: string,
  relation: string,
  declaredKeys: ReadonlySet<string>,
  existingKeys: readonly string[],
): void {
  if (existingKeys.some(key => !declaredKeys.has(key))) {
    throw new CataloguePopulationConflictError(
      `managed ${relation} drift for product ${productSlug}`,
    );
  }
}

async function identityConflict<T extends IdentityRecord>(
  label: string,
  byId: Promise<T | null>,
  byNaturalKey: Promise<T | readonly T[] | null>,
  id: string,
  matchesDeclaredIdentity: (record: T) => boolean,
): Promise<void> {
  const [existingId, existingNaturalKey] = await Promise.all([byId, byNaturalKey]);
  assertCatalogueIdentity(label, id, existingId, existingNaturalKey, matchesDeclaredIdentity);
}

async function assertManagedProductRelations(
  tx: Prisma.TransactionClient,
  product: ApprovedCatalogueProduct,
): Promise<void> {
  const [notes, suitability, collections, images, variants] = await Promise.all([
    tx.perfumeNote.findMany({
      where: { perfumeId: product.id },
      select: { noteId: true, layer: true },
    }),
    tx.perfumeSuitability.findMany({
      where: { perfumeId: product.id },
      select: { tagId: true },
    }),
    tx.collectionPerfume.findMany({
      where: { perfumeId: product.id },
      select: { collectionId: true },
    }),
    tx.perfumeImage.findMany({
      where: { perfumeId: product.id },
      select: { id: true },
    }),
    tx.perfumeVariant.findMany({
      where: { perfumeId: product.id },
      select: { id: true },
    }),
  ]);

  assertNoCatalogueRelationDrift(
    product.slug,
    "PerfumeNote",
    new Set(product.notes.map(note => `${note.noteId}:${note.layer}`)),
    notes.map(note => `${note.noteId}:${note.layer}`),
  );
  assertNoCatalogueRelationDrift(
    product.slug,
    "PerfumeSuitability",
    new Set(product.suitabilityTagIds),
    suitability.map(relation => relation.tagId),
  );
  assertNoCatalogueRelationDrift(
    product.slug,
    "CollectionPerfume",
    new Set(product.collectionIds),
    collections.map(relation => relation.collectionId),
  );
  assertNoCatalogueRelationDrift(
    product.slug,
    "PerfumeImage",
    new Set(product.images.map(image => image.id)),
    images.map(image => image.id),
  );
  assertNoCatalogueRelationDrift(
    product.slug,
    "PerfumeVariant",
    new Set(product.variants.map(variant => variant.id)),
    variants.map(variant => variant.id),
  );
}

async function populate(tx: Prisma.TransactionClient, manifest: ApprovedCatalogueManifest): Promise<void> {
  for (const family of manifest.vocabulary.families) {
    await identityConflict(`family ${family.name}`,
      tx.fragranceFamily.findUnique({ where: { id: family.id }, select: { id: true, name: true } }),
      tx.fragranceFamily.findUnique({ where: { name: family.name }, select: { id: true, name: true } }),
      family.id, record => record.name === family.name);
    await tx.fragranceFamily.upsert({ where: { id: family.id }, update: {
      name: family.name, description: family.description, active: family.active,
    }, create: family });
  }
  for (const note of manifest.vocabulary.notes) {
    await identityConflict(`note ${note.name}`,
      tx.fragranceNote.findUnique({ where: { id: note.id }, select: { id: true, name: true } }),
      tx.fragranceNote.findUnique({ where: { name: note.name }, select: { id: true, name: true } }),
      note.id, record => record.name === note.name);
    await tx.fragranceNote.upsert({ where: { id: note.id }, update: {
      name: note.name, description: note.description, active: note.active,
    }, create: note });
  }
  for (const intensity of manifest.vocabulary.intensities) {
    await identityConflict(`intensity ${intensity.name}`,
      tx.intensity.findUnique({ where: { id: intensity.id }, select: { id: true, name: true } }),
      tx.intensity.findUnique({ where: { name: intensity.name }, select: { id: true, name: true } }),
      intensity.id, record => record.name === intensity.name);
    await tx.intensity.upsert({ where: { id: intensity.id }, update: {
      name: intensity.name, active: intensity.active,
    }, create: intensity });
  }
  for (const tag of manifest.vocabulary.suitabilityTags) {
    await identityConflict(`suitability ${tag.category}:${tag.value}`,
      tx.suitabilityTag.findUnique({ where: { id: tag.id }, select: { id: true, category: true, value: true } }),
      tx.suitabilityTag.findUnique({
        where: { category_value: { category: tag.category, value: tag.value } },
        select: { id: true, category: true, value: true },
      }), tag.id, record => record.category === tag.category && record.value === tag.value);
    await tx.suitabilityTag.upsert({ where: { id: tag.id }, update: {
      category: tag.category, value: tag.value, active: tag.active,
    }, create: tag });
  }
  for (const collection of manifest.vocabulary.collections) {
    await identityConflict(`collection ${collection.name}`,
      tx.collection.findUnique({ where: { id: collection.id }, select: { id: true, name: true } }),
      tx.collection.findMany({ where: { name: collection.name }, select: { id: true, name: true } }),
      collection.id, record => record.name === collection.name);
    await tx.collection.upsert({ where: { id: collection.id }, update: {
      name: collection.name, type: collection.type, active: collection.active,
    }, create: collection });
  }

  for (const product of manifest.products) {
    await identityConflict(`product ${product.slug}`,
      tx.perfume.findUnique({ where: { id: product.id }, select: { id: true, slug: true } }),
      tx.perfume.findUnique({ where: { slug: product.slug }, select: { id: true, slug: true } }),
      product.id, record => record.slug === product.slug);
    await assertManagedProductRelations(tx, product);
    await tx.perfume.upsert({ where: { id: product.id }, update: {
      name: product.name, slug: product.slug, description: product.description, status: product.status,
      primaryFamilyId: product.primaryFamilyId, intensityId: product.intensityId,
      longevity: product.longevity, projection: product.projection, archivedAt: null,
    }, create: {
      id: product.id, name: product.name, slug: product.slug, description: product.description, status: product.status,
      primaryFamilyId: product.primaryFamilyId, intensityId: product.intensityId,
      longevity: product.longevity, projection: product.projection,
    } });

    for (const note of product.notes) await tx.perfumeNote.upsert({
      where: { perfumeId_noteId_layer: { perfumeId: product.id, noteId: note.noteId, layer: note.layer } },
      update: {}, create: { perfumeId: product.id, noteId: note.noteId, layer: note.layer },
    });
    for (const tagId of product.suitabilityTagIds) await tx.perfumeSuitability.upsert({
      where: { perfumeId_tagId: { perfumeId: product.id, tagId } }, update: {}, create: { perfumeId: product.id, tagId },
    });
    for (const collectionId of product.collectionIds) await tx.collectionPerfume.upsert({
      where: { collectionId_perfumeId: { collectionId, perfumeId: product.id } },
      update: {}, create: { collectionId, perfumeId: product.id },
    });
    for (const image of product.images) {
      await identityConflict(`image ${image.url}`,
        tx.perfumeImage.findUnique({
          where: { id: image.id },
          select: { id: true, url: true, perfumeId: true },
        }),
        tx.perfumeImage.findMany({
          where: { url: image.url },
          select: { id: true, url: true, perfumeId: true },
        }), image.id, record => record.url === image.url && record.perfumeId === product.id);
      await tx.perfumeImage.upsert({ where: { id: image.id }, update: {
        url: image.url, alt: image.alt, sortOrder: image.sortOrder,
      }, create: { ...image, perfumeId: product.id } });
    }

    for (const variant of product.variants) {
      await identityConflict(`variant ${variant.sku}`,
        tx.perfumeVariant.findUnique({
          where: { id: variant.id },
          select: { id: true, sku: true, perfumeId: true },
        }),
        tx.perfumeVariant.findUnique({
          where: { sku: variant.sku },
          select: { id: true, sku: true, perfumeId: true },
        }), variant.id, record => record.sku === variant.sku && record.perfumeId === product.id);
      const data = {
        sku: variant.sku, bottleSize: variant.bottleSize, concentration: variant.concentration,
        priceMinor: variant.priceMinor, currency: variant.currency, availability: variant.availability,
        personalisedLabel: variant.personalisedLabel, engravingName: variant.engravingName,
        giftMessage: variant.giftMessage, giftPackagingOptions: [...variant.giftPackagingOptions],
      };
      await tx.perfumeVariant.upsert({ where: { id: variant.id }, update: data, create: {
        id: variant.id, perfumeId: product.id, ...data,
      } });

      const inventory = variant.openingInventory;
      await tx.inventoryBalance.upsert({ where: { variantId: variant.id }, update: {}, create: {
        variantId: variant.id, onHand: inventory.onHand, reserved: inventory.reserved,
        lowStockThreshold: inventory.lowStockThreshold,
      } });
      const [movementById, movementByReference] = await Promise.all([
        tx.inventoryMovement.findUnique({ where: { id: inventory.movementId } }),
        tx.inventoryMovement.findUnique({ where: { reference: inventory.movementReference } }),
      ]);
      assertCatalogueIdentity(
        `opening movement ${inventory.movementReference}`,
        inventory.movementId,
        movementById,
        movementByReference,
        record => record.reference === inventory.movementReference && record.variantId === variant.id,
      );
      for (const movement of [movementById, movementByReference]) {
        if (movement && (movement.variantId !== variant.id || movement.quantityDelta !== inventory.onHand
          || movement.reason !== "CATALOGUE_OPENING_STOCK"
          || movement.reference !== inventory.movementReference)) {
          throw new CataloguePopulationConflictError(
            `opening movement ${inventory.movementReference} does not match declared stock`,
          );
        }
      }
      await tx.inventoryMovement.upsert({ where: { id: inventory.movementId }, update: {}, create: {
        id: inventory.movementId, variantId: variant.id, quantityDelta: inventory.onHand,
        reason: "CATALOGUE_OPENING_STOCK", reference: inventory.movementReference,
      } });
    }
  }
}

export type CataloguePopulationSummary = Readonly<{ products: number; variants: number; images: number }>;

export async function populateApprovedCatalogue(
  db: PrismaClient,
  manifest: ApprovedCatalogueManifest,
): Promise<CataloguePopulationSummary> {
  assertApprovedCatalogueManifest(manifest);
  await db.$transaction(tx => populate(tx, manifest), { timeout: 60_000 });
  return {
    products: manifest.products.length,
    variants: manifest.products.reduce((total, product) => total + product.variants.length, 0),
    images: manifest.products.reduce((total, product) => total + product.images.length, 0),
  };
}
