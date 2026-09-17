import { describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { AdminReportingService } from "../../src/modules/administration/reporting-service";
import { ids, seedId } from "../../prisma/seed-data";

export function reportingCases(db: PrismaClient): void {
  describe("administrator reporting read authority", () => {
    const service = new AdminReportingService(db);

    it("aggregates only paid orders and applies the requested period", async () => {
      const result = await service.dashboard({ from: "2026-08-31T00:00:00.000Z", to: "2026-09-02T00:00:00.000Z" });
      expect(result).toMatchObject({ ok: true, data: {
        totalOrders: 1,
        totalSales: { amountMinor: 25000, currency: "AUD" },
        bestSelling: [{ perfumeId: ids.perfume, name: "Demo Citrus", unitsSold: 2 }],
      } });
      const empty = await service.dashboard({ from: "2026-09-02T00:00:00.000Z", to: "2026-09-03T00:00:00.000Z" });
      expect(empty).toMatchObject({ ok: true, data: { totalOrders: 0, totalSales: { amountMinor: 0 }, bestSelling: [] } });
    });

    it("counts missing and configured low-stock balances fail-closed", async () => {
      const before = await service.dashboard({ from: "2026-08-31T00:00:00.000Z", to: "2026-09-02T00:00:00.000Z" });
      if (!before.ok) throw new Error("Expected reporting baseline");
      const variant = await db.perfumeVariant.create({ data: {
        id: seedId(9910), perfumeId: ids.perfume, sku: "REPORTING-NO-BALANCE", bottleSize: "30 ml",
        concentration: "Eau de Parfum", priceMinor: 5000, currency: "AUD",
      } });
      const result = await service.dashboard({ from: "2026-08-31T00:00:00.000Z", to: "2026-09-02T00:00:00.000Z" });
      expect(result).toMatchObject({ ok: true, data: { lowStockVariantCount: before.data.lowStockVariantCount + 1 } });
      await db.perfumeVariant.delete({ where: { id: variant.id } });
    });

    it("rejects invalid and non-increasing periods", async () => {
      expect(await service.dashboard({ from: "not-a-date", to: "2026-09-02T00:00:00.000Z" })).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
      expect(await service.dashboard({ from: "2026-09-02T00:00:00.000Z", to: "2026-09-02T00:00:00.000Z" })).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    });
  });
}
