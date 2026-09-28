import { describe, expect, it } from "vitest";
import { approvedCatalogueManifest } from "../../prisma/catalogue-data";
import { populateApprovedCatalogue } from "../../prisma/catalogue-population";
import { generateHistory } from "../../prisma/demo-history/generator";
import { persistHistory, protectedCounts } from "../../prisma/demo-history/persistence";
import { historyProfile, type HistoryInput } from "../../prisma/demo-history/types";
import { validateHistory } from "../../prisma/demo-history/validation";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { AdminOrdersService } from "../../src/modules/administration/orders-service";
import { AdminReportingService } from "../../src/modules/administration/reporting-service";
import { ReviewService } from "../../src/modules/participation/reviews/service";
import { ids } from "../../prisma/seed-data";

export function demoHistoryCases(db: PrismaClient): void {
  describe("synthetic imported demo history", () => {
    it("persists additively and idempotently without changing protected state", async () => {
      await populateApprovedCatalogue(db, approvedCatalogueManifest);
      const products = approvedCatalogueManifest.products;
      const [variants, rows, delivery, moderator] = await Promise.all([
        db.perfumeVariant.findMany({ where: { id: { in: products.flatMap(product => product.variants.map(variant => variant.id)) } }, select: { id: true, perfumeId: true, sku: true, priceMinor: true, currency: true, availability: true, perfume: { select: { name: true } } } }),
        db.perfume.findMany({ where: { id: { in: products.map(product => product.id) } }, select: { createdAt: true } }),
        db.deliveryMethod.findFirstOrThrow({ where: { active: true, currency: "AUD" } }), db.adminAccount.findUniqueOrThrow({ where: { id: ids.admin } }),
      ]);
      const cutover = new Date(Math.min(...rows.map(row => row.createdAt.getTime()))); const input: HistoryInput = { profile: historyProfile, seed: 20260928, asOf: new Date(cutover.getTime() + 86_400_000), cutover, variants: variants.map(variant => ({ ...variant, perfumeName: variant.perfume.name })), delivery, moderatorId: moderator.id };
      const dataset = generateHistory(input); validateHistory(dataset, input); const before = await protectedCounts(db); const baselineOrders = await db.order.count();
      expect(await persistHistory(db, dataset)).toBe("inserted"); expect(await persistHistory(db, dataset)).toBe("noop");
      const after = await protectedCounts(db);
      expect(after.inventoryBalances).toEqual(before.inventoryBalances); expect(after.inventoryMovements).toBe(before.inventoryMovements); expect(after.productionBatches).toBe(before.productionBatches); expect(after.supportConversations).toBe(before.supportConversations); expect(after.supportMessages).toBe(before.supportMessages); expect(after.supportFeedback).toBe(before.supportFeedback);
      expect(await db.order.count()).toBe(baselineOrders + dataset.orders.length); expect(await db.inventoryReservation.count({ where: { orderId: { in: dataset.orders.map(order => order.id) } } })).toBe(0); expect(await db.inventoryMovement.count()).toBe(before.inventoryMovements);
      expect(await db.customer.count({ where: { id: { in: dataset.customers.map(customer => customer.id) }, authUserId: null } })).toBe(dataset.customers.length);
      const report = await new AdminReportingService(db).dashboard({ from: new Date(cutover.getTime() - 181 * 86_400_000).toISOString(), to: cutover.toISOString() }); expect(report.ok && report.data.totalOrders > 0 && report.data.totalSales.amountMinor > 0 && report.data.bestSelling.length > 0).toBe(true);
      const firstOrder = dataset.orders[0]; const approved = dataset.reviews.find(review => review.status === "APPROVED"); if (!firstOrder || !approved) throw new Error("History test fixture is incomplete.");
      const detail = await new AdminOrdersService(db).get(firstOrder.id); expect(detail.ok && detail.data.items.length > 0 && detail.data.paymentReference?.startsWith("demo_history_pi_") && detail.data.shipment?.events.length).toBeTruthy();
      const publicReviews = await new ReviewService(db).publicForPerfume(approved.perfumeId); expect(publicReviews.ok && publicReviews.data.some(review => review.id === approved.id)).toBe(true);
    });
  });
}
