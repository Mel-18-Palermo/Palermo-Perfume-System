import type { Endpoint, EntityId, Timestamp } from "./common";

export type ShipmentStatus = "PENDING" | "DISPATCHED" | "IN_TRANSIT" | "DELIVERED";
export type TrackingEventDto = Readonly<{ status: ShipmentStatus; occurredAt: Timestamp; description: string }>;
export type ShipmentTrackingDto = Readonly<{
  shipmentId: EntityId; orderId: EntityId; status: ShipmentStatus;
  trackingReference: string | null; events: readonly TrackingEventDto[]; updatedAt: Timestamp;
  confirmation: Readonly<{ source: "INTERNAL_SIMULATOR"; deliveredAt: Timestamp }> | null;
}>;
export type TrackingApi = Readonly<{
  get: Endpoint<{ readonly orderId: EntityId }, ShipmentTrackingDto>;
}>;
