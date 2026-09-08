"use client";

import { api, createApiClient } from "@/lib/api";
import type { PalermoApi } from "@/contracts/api";

/**
 * Shared mock admin API instance for the admin catalogue UI (#258).
 *
 * Module-level singleton: as long as this module stays loaded in the
 * browser (i.e. across client-side navigation within the same tab), every
 * catalogue component that imports this file sees the same in-memory mock
 * state (revisions, archive status, etc.), so actions like archiving a
 * perfume persist as you navigate between admin pages.
 *
 * State resets on a full page reload. That is expected: this issue's scope
 * is presentation only against canonical mocks, not real persistence. Real
 * admin catalogue integration is implemented under #270.
 *
 * Do not import this from a Server Component -- it must only run in the
 * browser so all client components share the exact same instance.
 */
const adminApi: PalermoApi = createApiClient(api);

export function getAdminCatalogueApi(): PalermoApi["admin"] {
  return adminApi.admin;
}

/** Public catalogue filter options (family/note/intensity/occasion/mood/weather). */
export function getCatalogueFilters() {
  return adminApi.catalogue.getFilters(undefined);
}
