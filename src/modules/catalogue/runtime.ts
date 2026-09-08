import "server-only";
import { getDatabase } from "../../lib/db";
import { CatalogueService } from "./service";

export function getCatalogueService(): CatalogueService { return new CatalogueService(getDatabase()); }
