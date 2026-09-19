"use client";

import { api, createApiClient } from "@/lib/api";
import { createMockApi } from "@/lib/api/mocks";
import type { AdminApi } from "@/contracts/admin";

// Inventory and batch screens remain canonical-mock previews
// until their shared API connections are ready.
const previewApi = createApiClient(
  createMockApi({ actor: "ADMIN" }),
);

// Dashboard requests use the real server-authorized API.
// Other operations remain mock-backed.
const milestoneApi: AdminApi = {
  ...previewApi.admin,
  getDashboard: period => api.admin.getDashboard(period),
};

export function getAdminMilestoneApi(): AdminApi {
  return milestoneApi;
}