import "server-only";
import { getDatabase } from "../../lib/db";
import { DiscoveryService } from "./service";
export function getDiscoveryService(): DiscoveryService { return new DiscoveryService(getDatabase()); }
