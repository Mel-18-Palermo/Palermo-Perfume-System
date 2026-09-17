import "server-only";
import { getDatabase } from "../../lib/db";
import { AdminReportingService } from "./reporting-service";

export function getAdminReportingService(): AdminReportingService {
  return new AdminReportingService(getDatabase());
}
