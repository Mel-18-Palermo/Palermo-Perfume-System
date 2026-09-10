import "server-only";
import { getDatabase } from "../../lib/db";
import { AdminCatalogueService } from "./admin-service";
export function getAdminCatalogueService(): AdminCatalogueService { return new AdminCatalogueService(getDatabase()); }
