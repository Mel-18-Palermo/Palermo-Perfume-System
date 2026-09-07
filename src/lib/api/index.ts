import type { PalermoApi } from "../../contracts/api";
import { createUnavailableApi } from "./unavailable";

/** Inject one adapter at the composition boundary. Components use the same api.* interface. */
export function createApiClient(adapter: PalermoApi): PalermoApi {
  return adapter;
}

/** Safe default until server endpoints are wired. Mocks require an explicit separate import. */
export const api = createApiClient(createUnavailableApi());
