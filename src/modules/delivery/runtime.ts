import "server-only";
import { getDatabase } from "../../lib/db";
import { DeliveryService } from "./service";

export function getDeliveryService(): DeliveryService {
  return new DeliveryService(getDatabase());
}
