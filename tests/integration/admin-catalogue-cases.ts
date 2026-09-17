import { describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import type { PerfumeInput, VariantInput } from "../../src/contracts/admin";
import { CatalogueService } from "../../src/modules/catalogue/service";
import { AdminCatalogueService } from "../../src/modules/catalogue/admin-service";
import { ids, seedId } from "../../prisma/seed-data";

const perfumeInput = (suffix: string): PerfumeInput => ({
  name: `Managed ${suffix}`, slug: `managed-${suffix.toLowerCase()}`, description: "Administrator managed catalogue record.", primaryFamilyId: ids.family,
  intensity: { id: ids.intensity, label: "Light" }, notes: [{ id: ids.note, label: "Bergamot", description: null, layer: "TOP" }],
  suitability: { occasion: [], mood: [], weather: [], daypart: [], season: [] }, images: [], longevity: null, projection: null,
});
const variantInput: VariantInput = { sku: "MANAGED-50", bottleSize: "50 ml", concentration: "Eau de Parfum", price: { amountMinor: 12500, currency: "AUD" }, availability: "AVAILABLE", customisations: { personalisedLabel: true, engravingName: false, giftMessage: true, giftPackaging: [] } };

export function adminCatalogueCases(db: PrismaClient): void {
  describe("administrator catalogue mutation authority", () => {
    const service = new AdminCatalogueService(db);
    it("creates, updates and archives a perfume with revision conflicts", async () => {
      const created = await service.create({ ...perfumeInput("Perfume"), idempotencyKey: "managed-perfume-key" });
      expect(created.ok).toBe(true); if (!created.ok) return;
      expect(created.data.status).toBe("ACTIVE");
      const updated = await service.update(created.data.perfume.id, created.data.revision, { ...perfumeInput("Perfume"), name: "Managed Perfume Updated" });
      expect(updated.ok).toBe(true); if (!updated.ok) return;
      expect(updated.data.perfume.name).toBe("Managed Perfume Updated");
      expect((await service.update(created.data.perfume.id, created.data.revision, perfumeInput("Perfume"))).ok).toBe(false);
      const archived = await service.archive(created.data.perfume.id, updated.data.revision);
      expect(archived.ok).toBe(true); if (!archived.ok) return;
      expect(archived.data.status).toBe("ARCHIVED");
      expect((await new CatalogueService(db).get(created.data.perfume.id)).ok).toBe(false);
      expect((await service.archive(created.data.perfume.id, archived.data.revision)).ok).toBe(false);
      expect((await service.update(created.data.perfume.id, archived.data.revision, perfumeInput("Perfume"))).ok).toBe(false);
      expect(await service.createVariant(created.data.perfume.id, { ...variantInput, sku: "ARCHIVED-50", idempotencyKey: "archived-variant-key" })).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    });
    it("creates and updates variants without manufacturing inventory", async () => {
      const created = await service.create({ ...perfumeInput("Variant"), idempotencyKey: "managed-variant-key" });
      expect(created.ok).toBe(true); if (!created.ok) return;
      const variant = await service.createVariant(created.data.perfume.id, { ...variantInput, idempotencyKey: "managed-variant-key" });
      expect(variant.ok).toBe(true); if (!variant.ok) return;
      expect((await service.get(created.data.perfume.id))).toMatchObject({ ok: true, data: { perfume: { priceFrom: { amountMinor: 12500 } } } });
      expect(await db.inventoryBalance.findUnique({ where: { variantId: variant.data.id } })).toBeNull();
      const current = await service.get(created.data.perfume.id); expect(current.ok).toBe(true); if (!current.ok) return;
      const updated = await service.updateVariant(created.data.perfume.id, variant.data.id, current.data.revision, { ...variantInput, price: { amountMinor: 13000, currency: "AUD" } });
      expect(updated.ok).toBe(true); if (!updated.ok) return;
      expect(updated.data.price.amountMinor).toBe(13000);
      expect((await service.updateVariant(created.data.perfume.id, variant.data.id, current.data.revision, variantInput)).ok).toBe(false);
      const after = await service.get(created.data.perfume.id);
      expect(after.ok).toBe(true); if (!after.ok) return;
      expect(await service.updateVariant(created.data.perfume.id, variant.data.id, after.data.revision, { ...variantInput, sku: "DEMO-CITRUS-50" })).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
      expect((await service.get(created.data.perfume.id))).toMatchObject({ ok: true, data: { revision: after.data.revision } });
    });
    it("rejects invalid fields and missing records", async () => {
      expect((await service.create({ ...perfumeInput("Invalid"), slug: "BAD SLUG", idempotencyKey: "invalid-key" })).ok).toBe(false);
      expect((await service.createVariant(ids.perfume, { ...variantInput, price: { amountMinor: -1, currency: "AUD" } })).ok).toBe(false);
      expect((await service.get(seedId(9999))).ok).toBe(false);
    });
    it("replays identical create requests and rejects changed fingerprints without extra writes", async () => {
      const input = { ...perfumeInput("Replay"), idempotencyKey: "perfume-replay-key" };
      const first = await service.create(input);
      expect(first.ok).toBe(true); if (!first.ok) return;
      expect(await service.create(input)).toEqual(first);
      expect(await service.create({ ...input, name: "Changed request" })).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
      expect(await db.perfume.count({ where: { slug: input.slug } })).toBe(1);

      const variant = { ...variantInput, sku: "MANAGED-REPLAY-50", idempotencyKey: "variant-replay-key" };
      const created = await service.createVariant(first.data.perfume.id, variant);
      expect(created.ok).toBe(true); if (!created.ok) return;
      const revision = (await db.perfume.findUniqueOrThrow({ where: { id: first.data.perfume.id } })).revision;
      expect(await service.createVariant(first.data.perfume.id, variant)).toEqual(created);
      expect(await service.createVariant(first.data.perfume.id, { ...variant, price: { amountMinor: 9900, currency: "AUD" } })).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
      expect(await db.perfumeVariant.count({ where: { perfumeId: first.data.perfume.id, sku: variant.sku } })).toBe(1);
      expect((await db.perfume.findUniqueOrThrow({ where: { id: first.data.perfume.id } })).revision).toBe(revision);
      expect(await db.inventoryBalance.findUnique({ where: { variantId: created.data.id } })).toBeNull();
    });
    it("uses the lowest actual configured variant price", async () => {
      const created = await service.create({ ...perfumeInput("Prices"), idempotencyKey: "prices-create-key" });
      expect(created.ok).toBe(true); if (!created.ok) return;
      const first = await service.createVariant(created.data.perfume.id, { ...variantInput, sku: "MANAGED-PRICE-HIGH", price: { amountMinor: 25000, currency: "AUD" }, idempotencyKey: "prices-high-key" });
      expect(first.ok).toBe(true);
      const second = await service.createVariant(created.data.perfume.id, { ...variantInput, sku: "MANAGED-PRICE-LOW", price: { amountMinor: 9000, currency: "AUD" }, idempotencyKey: "prices-low-key" });
      expect(second.ok).toBe(true);
      expect(await service.get(created.data.perfume.id)).toMatchObject({ ok: true, data: { perfume: { priceFrom: { amountMinor: 9000, currency: "AUD" } } } });
    });
    it("rejects invalid canonical references and unsafe images before mutation", async () => {
      const missing = seedId(9981);
      const tag = await db.suitabilityTag.create({ data: { id: seedId(9982), category: "WEATHER", value: "Test weather" } });
      for (const [suffix, input] of [
        ["Family", { primaryFamilyId: missing }],
        ["Intensity", { intensity: { id: missing, label: "Missing" } }],
        ["Note", { notes: [{ id: missing, label: "Missing", description: null, layer: "TOP" as const }] }],
        ["Tag", { suitability: { occasion: [{ id: tag.id, label: tag.value }], mood: [], weather: [], daypart: [], season: [] } }],
        ["Image", { images: [{ id: seedId(9983), url: "javascript:alert(1)", alt: "Unsafe" }] }],
      ] as const) {
        const request = { ...perfumeInput(`Invalid${suffix}`), ...input, idempotencyKey: `invalid-${suffix.toLowerCase()}-key` };
        expect(await service.create(request)).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
        expect(await db.perfume.count({ where: { slug: request.slug } })).toBe(0);
      }
      const existing = await service.create({ ...perfumeInput("UpdateReferences"), idempotencyKey: "update-references-key" });
      expect(existing.ok).toBe(true); if (!existing.ok) return;
      expect(await service.update(existing.data.perfume.id, existing.data.revision, {
        ...perfumeInput("UpdateReferences"), primaryFamilyId: missing,
      })).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
      expect((await service.get(existing.data.perfume.id))).toMatchObject({ ok: true, data: { revision: existing.data.revision } });
    });
    it("rolls back perfume relations and variant parent revision on write failure", async () => {
      const imageId = seedId(9984);
      const existing = await service.create({ ...perfumeInput("ImageOwner"), images: [{ id: imageId, url: "/perfumes/owner.jpg", alt: "Owner" }], idempotencyKey: "image-owner-key" });
      expect(existing.ok).toBe(true);
      const collision = await service.create({ ...perfumeInput("ImageCollision"), images: [{ id: imageId, url: "/perfumes/collision.jpg", alt: "Collision" }], idempotencyKey: "image-collision-key" });
      expect(collision).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
      expect(await db.perfume.count({ where: { slug: "managed-imagecollision" } })).toBe(0);
      expect(await db.catalogueCreateRequest.count({ where: { operation: "PERFUME", key: "image-collision-key" } })).toBe(0);

      const created = await service.create({ ...perfumeInput("VariantRollback"), idempotencyKey: "variant-rollback-parent-key" });
      expect(created.ok).toBe(true); if (!created.ok) return;
      const before = (await db.perfume.findUniqueOrThrow({ where: { id: created.data.perfume.id } })).revision;
      const duplicateSku = await service.createVariant(created.data.perfume.id, { ...variantInput, sku: "DEMO-CITRUS-50", idempotencyKey: "variant-duplicate-sku-key" });
      expect(duplicateSku).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
      expect((await db.perfume.findUniqueOrThrow({ where: { id: created.data.perfume.id } })).revision).toBe(before);
      expect(await db.perfumeVariant.count({ where: { perfumeId: created.data.perfume.id } })).toBe(0);
      expect(await db.catalogueCreateRequest.count({ where: { operation: "VARIANT", key: "variant-duplicate-sku-key" } })).toBe(0);
    });
  });
}
