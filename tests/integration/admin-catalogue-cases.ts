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
    });
    it("creates and updates variants without manufacturing inventory", async () => {
      const created = await service.create({ ...perfumeInput("Variant"), idempotencyKey: "managed-variant-key" });
      expect(created.ok).toBe(true); if (!created.ok) return;
      const variant = await service.createVariant(created.data.perfume.id, { ...variantInput, idempotencyKey: "managed-variant-key" });
      expect(variant.ok).toBe(true); if (!variant.ok) return;
      expect(await db.inventoryBalance.findUnique({ where: { variantId: variant.data.id } })).toBeNull();
      const current = await service.get(created.data.perfume.id); expect(current.ok).toBe(true); if (!current.ok) return;
      const updated = await service.updateVariant(created.data.perfume.id, variant.data.id, current.data.revision, { ...variantInput, price: { amountMinor: 13000, currency: "AUD" } });
      expect(updated.ok).toBe(true); if (!updated.ok) return;
      expect(updated.data.price.amountMinor).toBe(13000);
      expect((await service.updateVariant(created.data.perfume.id, variant.data.id, current.data.revision, variantInput)).ok).toBe(false);
    });
    it("rejects invalid fields and missing records", async () => {
      expect((await service.create({ ...perfumeInput("Invalid"), slug: "BAD SLUG", idempotencyKey: "invalid-key" })).ok).toBe(false);
      expect((await service.createVariant(ids.perfume, { ...variantInput, price: { amountMinor: -1, currency: "AUD" } })).ok).toBe(false);
      expect((await service.get(seedId(9999))).ok).toBe(false);
    });
  });
}
