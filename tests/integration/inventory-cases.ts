import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ids } from "../../prisma/seed-data";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { InventoryService } from "../../src/modules/inventory/service";

const initialTime = new Date("2026-09-08T00:00:00.000Z");
const actor = { adminId: ids.admin, permissions: ["inventory:manage"] } as const;

function data<T>(result: { ok: true; data: T } | { ok: false; error: unknown }): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected a successful inventory result");
  return result.data;
}

export function inventoryCases(db: PrismaClient): void {
  describe("authoritative inventory ledger", () => {
    const service = new InventoryService(db, () => initialTime);

    async function variant(suffix: string, balance?: { onHand: number; reserved?: number; threshold?: number }): Promise<string> {
      const created = await db.perfumeVariant.create({
        data: {
          perfumeId: ids.woodyPerfume,
          sku: `INVENTORY-${suffix}-${randomUUID().slice(0, 8)}`,
          bottleSize: "50 ml",
          concentration: "Eau de Parfum",
          priceMinor: 15000,
          currency: "AUD",
        },
      });
      if (balance) {
        await db.inventoryBalance.create({
          data: {
            variantId: created.id,
            onHand: balance.onHand,
            reserved: balance.reserved ?? 0,
            lowStockThreshold: balance.threshold ?? 0,
          },
        });
      }
      return created.id;
    }

    it("derives available and low-stock state from the authoritative balance", async () => {
      const variantId = await variant("LOW", { onHand: 5, reserved: 3, threshold: 2 });
      expect(data(await service.get(variantId))).toMatchObject({
        variantId,
        onHand: 5,
        reserved: 3,
        available: 2,
        lowStock: true,
      });
    });

    it("reserves, releases and commits without mutating stock more than once", async () => {
      const variantId = await variant("LIFECYCLE", { onHand: 5 });
      const released = data(await service.reserve(
        ids.paidOrder,
        variantId,
        1,
        new Date("2026-09-08T00:15:00.000Z"),
      ));
      expect((await service.get(variantId)).ok).toBe(true);
      expect((await service.release(released.reservationId)).ok).toBe(true);
      expect((await service.release(released.reservationId)).ok).toBe(true);
      expect(data(await service.get(variantId)).reserved).toBe(0);

      const committed = data(await service.reserve(
        ids.pendingOrder,
        variantId,
        2,
        new Date("2026-09-08T00:15:00.000Z"),
      ));
      expect((await service.commit(committed.reservationId)).ok).toBe(true);
      expect((await service.commit(committed.reservationId)).ok).toBe(true);
      expect(data(await service.get(variantId))).toMatchObject({ onHand: 3, reserved: 0, available: 3 });
      expect(await db.inventoryMovement.count({ where: { reference: `reservation-commit-${committed.reservationId}` } })).toBe(1);
    });

    it("records validated, attributable and idempotent batches without creating stock", async () => {
      const variantId = await variant("RECORD");
      const input = {
        variantId,
        batchCode: `batch-${randomUUID().slice(0, 8)}`,
        producedQuantity: 7,
        productionDate: "2026-09-07T00:00:00.000Z",
        idempotencyKey: `record:${randomUUID()}`,
      };
      const forbidden = await service.recordBatch({ adminId: ids.admin, permissions: [] }, input);
      expect(forbidden.ok).toBe(false);
      if (!forbidden.ok) expect(forbidden.error.code).toBe("FORBIDDEN");
      for (const invalid of [
        { ...input, producedQuantity: 0 },
        { ...input, productionDate: "not-a-date" },
        { ...input, productionDate: "2026-09-09T00:00:00.000Z" },
        { ...input, batchCode: "?" },
      ]) {
        const result = await service.recordBatch(actor, invalid);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
      }

      const first = data(await service.recordBatch(actor, input));
      expect(first).toMatchObject({ variantId, producedQuantity: 7, status: "RECORDED", releasedAt: null });
      expect(await service.recordBatch(actor, input)).toEqual({ ok: true, data: first });
      const conflict = await service.recordBatch(actor, { ...input, producedQuantity: 8 });
      expect(conflict.ok).toBe(false);
      if (!conflict.ok) expect(conflict.error.code).toBe("CONFLICT");
      const duplicateCode = await service.recordBatch(actor, {
        ...input,
        idempotencyKey: `record:${randomUUID()}`,
      });
      expect(duplicateCode.ok).toBe(false);
      if (!duplicateCode.ok) expect(duplicateCode.error.code).toBe("CONFLICT");
      const unavailableVariantId = await variant("UNAVAILABLE");
      await db.perfumeVariant.update({
        where: { id: unavailableVariantId },
        data: { availability: "UNAVAILABLE" },
      });
      const unavailable = await service.recordBatch(actor, {
        ...input,
        variantId: unavailableVariantId,
        batchCode: `UNAVAILABLE-${randomUUID().slice(0, 8)}`,
        idempotencyKey: `record:${randomUUID()}`,
      });
      expect(unavailable.ok).toBe(false);
      if (!unavailable.ok) expect(unavailable.error.code).toBe("NOT_FOUND");
      expect(await db.inventoryBalance.findUnique({ where: { variantId } })).toBeNull();
      expect(await db.inventoryMovement.count({ where: { productionBatchId: first.id } })).toBe(0);
      expect(await db.productionBatch.findUniqueOrThrow({ where: { id: first.id } })).toMatchObject({
        recordedByAdminId: ids.admin,
        recordIdempotencyKey: input.idempotencyKey,
      });
    });

    it("releases a batch exactly once under simultaneous requests", async () => {
      const variantId = await variant("BATCH-RACE");
      const batch = data(await service.recordBatch(actor, {
        variantId,
        batchCode: `RACE-${randomUUID().slice(0, 8)}`,
        producedQuantity: 9,
        productionDate: "2026-09-07T00:00:00.000Z",
        idempotencyKey: `record:${randomUUID()}`,
      }));
      const releaseKey = `release:${randomUUID()}`;
      const results = await Promise.all([
        service.releaseBatch(actor, batch.id, releaseKey),
        service.releaseBatch(actor, batch.id, releaseKey),
      ]);
      expect(results.every(result => result.ok)).toBe(true);
      expect(results.map(data)).toEqual([
        expect.objectContaining({ id: batch.id, status: "RELEASED" }),
        expect.objectContaining({ id: batch.id, status: "RELEASED" }),
      ]);
      expect(data(await service.get(variantId))).toMatchObject({ onHand: 9, reserved: 0, available: 9 });
      expect(await db.inventoryMovement.count({ where: { productionBatchId: batch.id } })).toBe(1);
      expect(await db.productionBatch.findUniqueOrThrow({ where: { id: batch.id } })).toMatchObject({
        releasedByAdminId: ids.admin,
        releaseIdempotencyKey: releaseKey,
      });
      expect((await service.releaseBatch(actor, batch.id, releaseKey)).ok).toBe(true);
      expect(data(await service.get(variantId)).onHand).toBe(9);
    });

    it("prevents oversell when simultaneous reservations exceed availability", async () => {
      const variantId = await variant("RESERVE-RACE", { onHand: 10 });
      const expiresAt = new Date("2026-09-08T00:15:00.000Z");
      const results = await Promise.all([
        service.reserve(ids.paidOrder, variantId, 6, expiresAt),
        service.reserve(ids.pendingOrder, variantId, 6, expiresAt),
      ]);
      expect(results.filter(result => result.ok)).toHaveLength(1);
      expect(results.filter(result => !result.ok && result.error.code === "CONFLICT")).toHaveLength(1);
      const balance = await db.inventoryBalance.findUniqueOrThrow({ where: { variantId } });
      expect(balance).toMatchObject({ onHand: 10, reserved: 6 });
      expect(balance.reserved).toBeLessThanOrEqual(balance.onHand);
      expect(await db.inventoryReservation.count({ where: { variantId, status: "ACTIVE" } })).toBe(1);
    });

    it("expires reservations only after their deadline and releases reserved quantity", async () => {
      let now = initialTime;
      const timed = new InventoryService(db, () => now);
      const variantId = await variant("EXPIRE", { onHand: 4 });
      const reservation = data(await timed.reserve(
        ids.paidOrder,
        variantId,
        2,
        new Date("2026-09-08T00:01:00.000Z"),
      ));
      const early = await timed.expire(reservation.reservationId);
      expect(early.ok).toBe(false);
      if (!early.ok) expect(early.error.code).toBe("CONFLICT");
      now = new Date("2026-09-08T00:02:00.000Z");
      const lateCommit = await timed.commit(reservation.reservationId);
      expect(lateCommit.ok).toBe(false);
      if (!lateCommit.ok) expect(lateCommit.error.code).toBe("CONFLICT");
      expect((await timed.expire(reservation.reservationId)).ok).toBe(true);
      expect((await timed.expire(reservation.reservationId)).ok).toBe(true);
      expect(await db.inventoryReservation.findUniqueOrThrow({ where: { id: reservation.reservationId } })).toMatchObject({ status: "EXPIRED" });
      expect(data(await timed.get(variantId))).toMatchObject({ onHand: 4, reserved: 0, available: 4 });
    });
  });
}
