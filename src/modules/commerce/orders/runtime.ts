import "server-only";
import { getDatabase } from "../../../lib/db";
import { OrdersService } from "./service";
export function getOrdersService(): OrdersService { return new OrdersService(getDatabase()); }
