import "server-only";

import { configuredOpenAISupportProvider } from "../../integrations/ai/openai-support-provider";
import { getDatabase } from "../../lib/db";
import { SupportService } from "./service";

export function getSupportService(): SupportService {
  return new SupportService(getDatabase(), configuredOpenAISupportProvider());
}
