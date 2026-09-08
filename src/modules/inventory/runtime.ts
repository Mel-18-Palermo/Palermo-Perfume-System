import "server-only";
import { getDatabase } from "../../lib/db";
import { InventoryService } from "./service";
export function getInventoryService(): InventoryService { return new InventoryService(getDatabase()); }
