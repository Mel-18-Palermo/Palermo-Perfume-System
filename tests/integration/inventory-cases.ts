import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { ids, seedTime } from "../../prisma/seed-data";
import { InventoryService } from "../../src/modules/inventory/service";
export function inventoryCases(db: PrismaClient): void {
  describe("authoritative inventory ledger", () => {
    const service = new InventoryService(db, () => new Date("2026-09-08T00:00:00.000Z")); const actor = { adminId: ids.admin, permissions: ["inventory:manage"] };
    it("reads low-stock state and atomically reserves, releases and commits", async () => { const order = await db.order.findFirstOrThrow({ where: { customerId: ids.otherCustomer }, orderBy: { placedAt: "desc" } }); const before = await service.get(ids.woodyVariant); expect(before.ok).toBe(true); const reserved = await service.reserve(order.id, ids.woodyVariant, 1, new Date("2026-09-08T00:15:00Z")); expect(reserved.ok).toBe(true); if (!reserved.ok) return; const during = await service.get(ids.woodyVariant); expect(during.ok && during.data.reserved).toBe(1); expect((await service.release(reserved.data.reservationId)).ok).toBe(true); const committed = await service.reserve(ids.pendingOrder, ids.woodyVariant, 1, new Date("2026-09-08T00:15:00Z")); expect(committed.ok).toBe(true); if (committed.ok) { expect((await service.commit(committed.data.reservationId)).ok).toBe(true); expect((await service.commit(committed.data.reservationId)).ok).toBe(true); } });
    it("requires admin permission and releases a production batch exactly once", async () => { const batchId = randomUUID(); await db.productionBatch.create({ data: { id: batchId, variantId: ids.woodyVariant, batchCode: `TEST-BATCH-${batchId.slice(0, 8)}`, producedQuantity: 2, productionDate: seedTime } }); expect((await service.releaseBatch({ adminId: ids.otherCustomer, permissions: [] }, batchId)).ok).toBe(false); expect((await service.releaseBatch(actor, batchId)).ok).toBe(true); expect((await service.releaseBatch(actor, batchId)).ok).toBe(true); expect(await db.inventoryMovement.count({ where: { productionBatchId: batchId } })).toBe(1); });
    it("rejects reservations that exceed available stock", async () => { const order = await db.order.findFirstOrThrow({ where: { customerId: ids.otherCustomer }, orderBy: { placedAt: "desc" } }); const result = await service.reserve(order.id, ids.woodyVariant, 999, new Date("2026-09-08T00:15:00Z")); expect(result.ok).toBe(false); });
  });
}
