import type { ApiResult } from "../../contracts/common";
import type { ShipmentStatus, ShipmentTrackingDto } from "../../contracts/tracking";
import { failure, success } from "../../lib/api/result";
import type { Prisma, PrismaClient } from "../../lib/db/generated/client";
import type { DeliveryProvider } from "../../integrations/delivery/provider";
import { DeliverySimulator } from "../../integrations/delivery/simulator";

export type DeliveryActor =
  | Readonly<{ kind: "CUSTOMER"; customerId: string }>
  | Readonly<{ kind: "ADMIN"; adminId: string; permissions: readonly string[] }>;

const entityId = /^[0-9a-f-]{10,64}$/i;
const orderInclude = { payment: true, shipment: { include: { events: { orderBy: { occurredAt: "asc" } } } } } as const;
type LoadedOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
type LoadedShipment = NonNullable<LoadedOrder["shipment"]>;

const order: Record<ShipmentStatus, number> = { PENDING: 0, DISPATCHED: 1, IN_TRANSIT: 2, DELIVERED: 3 };

function uniqueConflict(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function admin(actor: DeliveryActor): boolean {
  return actor.kind === "ADMIN" && entityId.test(actor.adminId) && actor.permissions.includes("delivery:manage");
}

function dto(shipment: LoadedShipment, orderId: string): ShipmentTrackingDto {
  return {
    shipmentId: shipment.id,
    orderId,
    status: shipment.status,
    trackingReference: shipment.trackingReference,
    events: shipment.events.map(event => ({ status: event.status, occurredAt: event.occurredAt.toISOString(), description: event.description })),
    updatedAt: shipment.updatedAt.toISOString(),
    confirmation: shipment.status === "DELIVERED" && shipment.deliveredAt
      ? { source: "INTERNAL_SIMULATOR", deliveredAt: shipment.deliveredAt.toISOString() }
      : null,
  };
}

export class DeliveryService {
  constructor(
    private readonly db: PrismaClient,
    private readonly provider: DeliveryProvider = new DeliverySimulator(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async create(actor: DeliveryActor, orderId: string): Promise<ApiResult<ShipmentTrackingDto>> {
    if (!admin(actor)) return failure(actor.kind === "CUSTOMER" ? "FORBIDDEN" : "UNAUTHENTICATED");
    if (!entityId.test(orderId)) return failure("VALIDATION_ERROR");
    const existing = await this.db.order.findUnique({ where: { id: orderId }, include: orderInclude });
    if (!existing) return failure("NOT_FOUND");
    if (existing.payment?.status !== "SUCCEEDED") return failure("CONFLICT");
    if (existing.shipment) return success(dto(existing.shipment, existing.id));
    const created = await this.db.$transaction(async tx => {
      const reference = this.provider.create(orderId);
      const shipment = await tx.shipment.create({
        data: {
          orderId,
          trackingReference: reference.trackingReference,
          events: { create: { status: "PENDING", description: this.provider.transition("PENDING").description, occurredAt: this.now() } },
        },
        include: { events: { orderBy: { occurredAt: "asc" } } },
      });
      return shipment;
    }).catch(error => {
      if (uniqueConflict(error)) return null;
      throw error;
    });
    if (!created) {
      const replay = await this.db.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
      return replay.shipment ? success(dto(replay.shipment, replay.id)) : failure("CONFLICT");
    }
    return success(dto(created, orderId));
  }

  async get(actor: DeliveryActor, orderId: string): Promise<ApiResult<ShipmentTrackingDto>> {
    if (!entityId.test(orderId)) return failure("VALIDATION_ERROR");
    const found = await this.db.order.findUnique({ where: { id: orderId }, include: orderInclude });
    if (!found?.shipment) return failure("NOT_FOUND");
    if (actor.kind === "CUSTOMER") {
      if (!entityId.test(actor.customerId) || found.customerId !== actor.customerId) return failure("FORBIDDEN");
    } else if (!admin(actor)) return failure("FORBIDDEN");
    return success(dto(found.shipment, found.id));
  }

  async transition(actor: DeliveryActor, shipmentId: string, next: ShipmentStatus): Promise<ApiResult<ShipmentTrackingDto>> {
    if (!admin(actor)) return failure("FORBIDDEN");
    if (!entityId.test(shipmentId) || !(next in order)) return failure("VALIDATION_ERROR");
    const result = await this.db.$transaction(async tx => {
      const shipment = await tx.shipment.findUnique({ where: { id: shipmentId }, include: { events: { orderBy: { occurredAt: "asc" } } } });
      if (!shipment) return { kind: "NOT_FOUND" as const };
      if (shipment.status === next) return { kind: "DONE" as const, shipment };
      if (order[next] !== order[shipment.status] + 1 || shipment.status === "DELIVERED") return { kind: "CONFLICT" as const };
      const transitioned = await tx.shipment.update({
        where: { id: shipment.id },
        data: next === "DELIVERED"
          ? { status: next, deliveredAt: this.now(), confirmationSource: "INTERNAL_SIMULATOR", events: { create: { status: next, description: this.provider.transition(next).description, occurredAt: this.now() } }, order: { update: { status: "DELIVERED" } } }
          : { status: next, events: { create: { status: next, description: this.provider.transition(next).description, occurredAt: this.now() } } },
        include: { events: { orderBy: { occurredAt: "asc" } } },
      });
      return { kind: "DONE" as const, shipment: transitioned };
    });
    if (result.kind === "NOT_FOUND") return failure("NOT_FOUND");
    if (result.kind === "CONFLICT") return failure("CONFLICT");
    return success(dto(result.shipment, (await this.db.shipment.findUniqueOrThrow({ where: { id: shipmentId }, select: { orderId: true } })).orderId));
  }
}
