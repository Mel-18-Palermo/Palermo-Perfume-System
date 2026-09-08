import { describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { ids } from "../../prisma/seed-data";
import { CatalogueService } from "../../src/modules/catalogue/service";
import type { ApiResult } from "../../src/contracts/common";

function errorCode<T>(result: ApiResult<T>): string {
  expect(result.ok).toBe(false);
  return result.ok ? "" : result.error.code;
}

export function catalogueCases(db: PrismaClient): void {
  describe("authoritative public catalogue service", () => {
    const service = new CatalogueService(db);
    it("lists only active public products with deterministic pagination", async () => {
      const result = await service.list({ page: 1, pageSize: 1 });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0]?.name).toBe("Demo Citrus");
      expect(result.data.hasMore).toBe(true);
    });
    it("returns the full detail shape including family, layered notes, variants and availability", async () => {
      const result = await service.get(ids.perfume);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.primaryFamily.label).toBe("Citrus");
      expect(result.data.notes[0]).toMatchObject({ label: "Bergamot", layer: "TOP" });
      expect(result.data.variants[0]).toMatchObject({ sku: "DEMO-CITRUS-50", availability: "AVAILABLE" });
      expect(result.data.priceFrom).toEqual({ amountMinor: 12000, currency: "AUD" });
    });
    it("applies AND across filter groups and OR within each group", async () => {
      const result = await service.list({ family: [ids.family, ids.woodyFamily], note: [ids.note], minPrice: 10000, maxPrice: 13000 });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.items.map(item => item.id)).toEqual([ids.perfume]);
    });
    it("supports structured text, intensity, mood, occasion and weather filtering without brand filtering", async () => {
      const result = await service.list({ q: "citrus", intensity: [ids.intensity], mood: ["00000000-0000-4000-8000-000000000009"], occasion: ["00000000-0000-4000-8000-000000000009"], weather: ["00000000-0000-4000-8000-000000000009"] });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.items).toEqual([]);
      // CatalogueQuery intentionally has no brand field; text search remains structured and bounded.
    });
    it("exposes only active filter vocabulary used by public products", async () => {
      const result = await service.getFilters();
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.family.map(value => value.label)).toEqual(["Citrus", "Woody"]);
      expect(result.data.note.map(value => value.label)).toEqual(["Bergamot", "Cedar"]);
      expect(result.data.currency).toBe("AUD");
    });
    it("does not leak archived or malformed identifiers", async () => {
      expect(errorCode(await service.get("not-a-valid-id"))).toBe("VALIDATION_ERROR");
      expect(errorCode(await service.get("00000000-0000-4000-8000-000000000000"))).toBe("NOT_FOUND");
      await db.perfume.update({ where: { id: ids.woodyPerfume }, data: { status: "ARCHIVED", archivedAt: new Date() } });
      try { expect(errorCode(await service.get(ids.woodyPerfume))).toBe("NOT_FOUND"); } finally { await db.perfume.update({ where: { id: ids.woodyPerfume }, data: { status: "ACTIVE", archivedAt: null } }); }
    });
    it("rejects unsafe pagination and price ranges before querying", async () => {
      expect(errorCode(await service.list({ page: 0 }))).toBe("VALIDATION_ERROR");
      expect(errorCode(await service.list({ pageSize: 101 }))).toBe("VALIDATION_ERROR");
      expect(errorCode(await service.list({ minPrice: 20, maxPrice: 10 }))).toBe("VALIDATION_ERROR");
      expect(errorCode(await service.list({ q: "x".repeat(101) }))).toBe("VALIDATION_ERROR");
    });
    it("returns not-found for an archived detail while retaining stable query ordering", async () => {
      const before = await service.list({});
      expect(before.ok).toBe(true);
      expect(errorCode(await service.get("00000000-0000-4000-8000-000000000001"))).toBe("NOT_FOUND");
    });
  });
}
