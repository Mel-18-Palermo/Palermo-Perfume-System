import "server-only";

import { getDatabase } from "../../lib/db";
import { AdminOrdersService } from "./orders-service";

export function getAdminOrdersService(): AdminOrdersService {
  return new AdminOrdersService(getDatabase());
}
