import type { PalermoApi } from "../../contracts/api";
import { createUnavailableApi } from "./unavailable";
import { createAuthHttpClient } from "../auth/client";

/** Inject one adapter at the composition boundary. Components use the same api.* interface. */
export function createApiClient(adapter: PalermoApi): PalermoApi {
  return adapter;
}

/** Implemented auth uses server routes; other modules remain explicit unavailable boundaries. */
export const api = createApiClient({ ...createUnavailableApi(), auth: createAuthHttpClient() });
