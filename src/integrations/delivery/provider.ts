import type { ShipmentStatus } from "../../contracts/tracking";

export type DeliveryProvider = Readonly<{
  create(orderId: string): { trackingReference: string };
  transition(status: ShipmentStatus): { description: string };
}>;
