import type { ShipmentStatus } from "../../contracts/tracking";
import type { DeliveryProvider } from "./provider";

const descriptions: Record<ShipmentStatus, string> = {
  PENDING: "Shipment created by the internal simulator.",
  DISPATCHED: "Shipment dispatched by the internal simulator.",
  IN_TRANSIT: "Shipment is in transit in the internal simulator.",
  DELIVERED: "Shipment delivered by the internal simulator.",
};

export class DeliverySimulator implements DeliveryProvider {
  create(orderId: string): { trackingReference: string } {
    return { trackingReference: `PALERMO-${orderId.replaceAll("-", "").slice(0, 16).toUpperCase()}` };
  }

  transition(status: ShipmentStatus): { description: string } {
    return { description: descriptions[status] };
  }
}
