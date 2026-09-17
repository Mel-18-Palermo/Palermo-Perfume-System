"use client";

import { createApiClient } from "@/lib/api";
import { createMockApi } from "@/lib/api/mocks";
import type { AdminApi } from "@/contracts/admin";

// Temporary canonical-mock preview for #270.
// Real integration remains blocked by the shared API dependencies.
const previewApi = createApiClient(
  createMockApi({ actor: "ADMIN" }),
);

export function getAdminMilestoneApi(): AdminApi {
  return previewApi.admin;
}