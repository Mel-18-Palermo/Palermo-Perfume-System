import "server-only";

import { getDatabase } from "../../lib/db";
import { SupportService, type SupportProvider } from "./service";

const unavailableProvider: SupportProvider = {
  respond: async () => {
    throw new Error("Support provider is not configured.");
  },
};

export function getSupportService(): SupportService {
  return new SupportService(getDatabase(), unavailableProvider);
}
