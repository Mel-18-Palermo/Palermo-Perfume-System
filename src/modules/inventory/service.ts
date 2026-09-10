import { randomUUID } from "node:crypto";
import type { ProductionBatch } from "../../contracts/admin";
import type { ApiResult } from "../../contracts/common";
import { failure, success } from "../../lib/api/result";
import type { PrismaClient } from "../../lib/db/generated/client";

export type InventoryActor = Readonly<{ adminId: string; permissions: readonly string[] }>;
export type InventoryBalance = Readonly<{
  variantId: string;
  onHand: number;
  reserved: number;
  available: number;
  lowStock: boolean;
}>;
export type RecordBatchInput = Readonly<{
  variantId: string;
  batchCode: string;
  producedQuantity: number;
  productionDate: string;
  idempotencyKey: string;
}>;

const entityId = /^[0-9a-f-]{10,64}$/i;
const batchCode = /^[A-Z0-9][A-Z0-9._-]{2,63}$/;
const requestKey = /^[A-Za-z0-9._:-]{8,128}$/;

function hasInventoryAuthority(actor: InventoryActor): boolean {
  return entityId.test(actor.adminId) && actor.permissions.includes("inventory:manage");
}

function isUniqueConflict(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function batchDto(batch: {
  id: string;
  variantId: string;
  batchCode: string;
  producedQuantity: number;
  status: "RECORDED" | "RELEASED";
  productionDate: Date;
  releasedAt: Date | null;
}): ProductionBatch {
  return {
    id: batch.id,
    variantId: batch.variantId,
    batchCode: batch.batchCode,
    producedQuantity: batch.producedQuantity,
    status: batch.status,
    productionDate: batch.productionDate.toISOString(),
    releasedAt: batch.releasedAt?.toISOString() ?? null,
  };
}

export class InventoryService {
  constructor(private readonly db: PrismaClient, private readonly now: () => Date = () => new Date()) {}

  async get(variantId: string): Promise<ApiResult<InventoryBalance>> {
    if (!entityId.test(variantId)) return failure("VALIDATION_ERROR");
    const balance = await this.db.inventoryBalance.findUnique({ where: { variantId } });
    if (!balance) return failure("NOT_FOUND");
    const available = balance.onHand - balance.reserved;
    return success({
      variantId,
      onHand: balance.onHand,
      reserved: balance.reserved,
      available,
      lowStock: available <= balance.lowStockThreshold,
    });
  }

  async reserve(
    orderId: string,
    variantId: string,
    quantity: number,
    expiresAt: Date,
  ): Promise<ApiResult<{ reservationId: string }>> {
    if (!entityId.test(orderId) || !entityId.test(variantId) || !Number.isSafeInteger(quantity)
      || quantity < 1 || !Number.isFinite(expiresAt.valueOf()) || expiresAt <= this.now()) {
      return failure("VALIDATION_ERROR");
    }
    try {
      const reservationId = randomUUID();
      await this.db.$transaction(async (tx) => {
        const current = await tx.inventoryBalance.findUnique({ where: { variantId } });
        const changed = await tx.inventoryBalance.updateMany({
          where: {
            variantId,
            onHand: { gte: quantity },
            reserved: { lte: current ? current.onHand - quantity : -1 },
          },
          data: { reserved: { increment: quantity } },
        });
        if (changed.count !== 1) throw new Error("OUT_OF_STOCK");
        await tx.inventoryReservation.create({
          data: { id: reservationId, orderId, variantId, quantity, expiresAt },
        });
      });
      return success({ reservationId });
    } catch (error) {
      if ((error instanceof Error && error.message === "OUT_OF_STOCK") || isUniqueConflict(error)) {
        return failure("CONFLICT");
      }
      throw error;
    }
  }

  async release(reservationId: string): Promise<ApiResult<null>> {
    if (!entityId.test(reservationId)) return failure("VALIDATION_ERROR");
    const found = await this.db.$transaction(async (tx) => {
      const reservation = await tx.inventoryReservation.findUnique({ where: { id: reservationId } });
      if (!reservation) return false;
      if (reservation.status !== "ACTIVE") return true;
      const changed = await tx.inventoryReservation.updateMany({
        where: { id: reservationId, status: "ACTIVE" },
        data: { status: "RELEASED" },
      });
      if (changed.count === 1) {
        const balance = await tx.inventoryBalance.updateMany({
          where: { variantId: reservation.variantId, reserved: { gte: reservation.quantity } },
          data: { reserved: { decrement: reservation.quantity } },
        });
        if (balance.count !== 1) throw new Error("INVENTORY_INVARIANT");
      }
      return true;
    });
    return found ? success(null) : failure("NOT_FOUND");
  }

  async expire(reservationId: string): Promise<ApiResult<null>> {
    if (!entityId.test(reservationId)) return failure("VALIDATION_ERROR");
    const outcome = await this.db.$transaction(async (tx) => {
      const reservation = await tx.inventoryReservation.findUnique({ where: { id: reservationId } });
      if (!reservation) return "NOT_FOUND" as const;
      if (reservation.status !== "ACTIVE") return "DONE" as const;
      if (reservation.expiresAt > this.now()) return "TOO_EARLY" as const;
      const changed = await tx.inventoryReservation.updateMany({
        where: { id: reservationId, status: "ACTIVE", expiresAt: { lte: this.now() } },
        data: { status: "EXPIRED" },
      });
      if (changed.count === 1) {
        const balance = await tx.inventoryBalance.updateMany({
          where: { variantId: reservation.variantId, reserved: { gte: reservation.quantity } },
          data: { reserved: { decrement: reservation.quantity } },
        });
        if (balance.count !== 1) throw new Error("INVENTORY_INVARIANT");
      }
      return "DONE" as const;
    });
    if (outcome === "NOT_FOUND") return failure("NOT_FOUND");
    if (outcome === "TOO_EARLY") return failure("CONFLICT");
    return success(null);
  }

  async commit(reservationId: string): Promise<ApiResult<null>> {
    if (!entityId.test(reservationId)) return failure("VALIDATION_ERROR");
    const outcome = await this.db.$transaction(async (tx) => {
      const reservation = await tx.inventoryReservation.findUnique({ where: { id: reservationId } });
      if (!reservation) return "NOT_FOUND" as const;
      if (reservation.status === "COMMITTED") return "DONE" as const;
      if (reservation.status !== "ACTIVE" || reservation.expiresAt <= this.now()) return "CONFLICT" as const;
      const changed = await tx.inventoryReservation.updateMany({
        where: { id: reservationId, status: "ACTIVE", expiresAt: { gt: this.now() } },
        data: { status: "COMMITTED" },
      });
      if (changed.count !== 1) return "CONFLICT" as const;
      const balance = await tx.inventoryBalance.updateMany({
        where: {
          variantId: reservation.variantId,
          onHand: { gte: reservation.quantity },
          reserved: { gte: reservation.quantity },
        },
        data: {
          reserved: { decrement: reservation.quantity },
          onHand: { decrement: reservation.quantity },
        },
      });
      if (balance.count !== 1) throw new Error("INVENTORY_INVARIANT");
      await tx.inventoryMovement.create({
        data: {
          id: randomUUID(),
          variantId: reservation.variantId,
          quantityDelta: -reservation.quantity,
          reason: "RESERVATION_COMMITTED",
          reference: `reservation-commit-${reservation.id}`,
        },
      });
      return "DONE" as const;
    });
    if (outcome === "NOT_FOUND") return failure("NOT_FOUND");
    if (outcome === "CONFLICT") return failure("CONFLICT");
    return success(null);
  }

  async recordBatch(actor: InventoryActor, input: RecordBatchInput): Promise<ApiResult<ProductionBatch>> {
    if (!hasInventoryAuthority(actor)) return failure("FORBIDDEN");
    if (typeof input.variantId !== "string" || typeof input.batchCode !== "string"
      || typeof input.producedQuantity !== "number" || typeof input.productionDate !== "string"
      || typeof input.idempotencyKey !== "string") return failure("VALIDATION_ERROR");
    const code = input.batchCode.trim().toUpperCase();
    const productionDate = new Date(input.productionDate);
    if (!entityId.test(input.variantId) || !batchCode.test(code)
      || !Number.isSafeInteger(input.producedQuantity) || input.producedQuantity < 1
      || !Number.isFinite(productionDate.valueOf()) || productionDate > this.now()
      || !requestKey.test(input.idempotencyKey)) return failure("VALIDATION_ERROR");

    const replay = await this.db.productionBatch.findUnique({
      where: { recordIdempotencyKey: input.idempotencyKey },
    });
    if (replay) {
      const identical = replay.variantId === input.variantId && replay.batchCode === code
        && replay.producedQuantity === input.producedQuantity
        && replay.productionDate.valueOf() === productionDate.valueOf();
      return identical ? success(batchDto(replay)) : failure("CONFLICT");
    }

    const variant = await this.db.perfumeVariant.findUnique({
      where: { id: input.variantId },
      include: { perfume: true },
    });
    if (!variant || variant.availability !== "AVAILABLE" || variant.perfume.status !== "ACTIVE") {
      return failure("NOT_FOUND");
    }
    try {
      const created = await this.db.productionBatch.create({
        data: {
          id: randomUUID(),
          variantId: input.variantId,
          batchCode: code,
          recordIdempotencyKey: input.idempotencyKey,
          producedQuantity: input.producedQuantity,
          productionDate,
          recordedByAdminId: actor.adminId,
        },
      });
      return success(batchDto(created));
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      const concurrentReplay = await this.db.productionBatch.findUnique({
        where: { recordIdempotencyKey: input.idempotencyKey },
      });
      if (concurrentReplay && concurrentReplay.variantId === input.variantId
        && concurrentReplay.batchCode === code
        && concurrentReplay.producedQuantity === input.producedQuantity
        && concurrentReplay.productionDate.valueOf() === productionDate.valueOf()) {
        return success(batchDto(concurrentReplay));
      }
      return failure("CONFLICT");
    }
  }

  async releaseBatch(
    actor: InventoryActor,
    batchId: string,
    idempotencyKey: string,
  ): Promise<ApiResult<ProductionBatch>> {
    if (!hasInventoryAuthority(actor)) return failure("FORBIDDEN");
    if (!entityId.test(batchId) || !requestKey.test(idempotencyKey)) return failure("VALIDATION_ERROR");
    try {
      const outcome = await this.db.$transaction(async (tx) => {
        const batch = await tx.productionBatch.findUnique({ where: { id: batchId } });
        if (!batch) return { kind: "NOT_FOUND" as const };
        if (batch.status === "RELEASED") return { kind: "DONE" as const, batch };
        const changed = await tx.productionBatch.updateMany({
          where: { id: batchId, status: "RECORDED", releaseIdempotencyKey: null },
          data: {
            status: "RELEASED",
            releasedAt: this.now(),
            releasedByAdminId: actor.adminId,
            releaseIdempotencyKey: idempotencyKey,
          },
        });
        if (changed.count !== 1) {
          const current = await tx.productionBatch.findUniqueOrThrow({ where: { id: batchId } });
          return current.status === "RELEASED"
            ? { kind: "DONE" as const, batch: current }
            : { kind: "CONFLICT" as const };
        }
        await tx.inventoryBalance.upsert({
          where: { variantId: batch.variantId },
          create: { variantId: batch.variantId, onHand: batch.producedQuantity, reserved: 0 },
          update: { onHand: { increment: batch.producedQuantity } },
        });
        await tx.inventoryMovement.create({
          data: {
            id: randomUUID(),
            variantId: batch.variantId,
            productionBatchId: batch.id,
            quantityDelta: batch.producedQuantity,
            reason: "PRODUCTION_BATCH_RELEASE",
            reference: `batch-release-${batch.id}`,
          },
        });
        return {
          kind: "DONE" as const,
          batch: await tx.productionBatch.findUniqueOrThrow({ where: { id: batchId } }),
        };
      });
      if (outcome.kind === "NOT_FOUND") return failure("NOT_FOUND");
      if (outcome.kind === "CONFLICT") return failure("CONFLICT");
      return success(batchDto(outcome.batch));
    } catch (error) {
      if (isUniqueConflict(error)) return failure("CONFLICT");
      throw error;
    }
  }
}
