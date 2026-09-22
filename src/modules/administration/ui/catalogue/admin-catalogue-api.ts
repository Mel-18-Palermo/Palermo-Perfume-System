"use client";

import { api } from "@/lib/api";
import type { AdminApi } from "@/contracts/admin";

/**
 * Catalogue records and mutations use the canonical administrator boundary.
 */
export function getAdminCatalogueApi(): AdminApi {
  return api.admin;
}

export function getCatalogueReferences() {
  return api.admin.getCatalogueReferences(undefined);
}
