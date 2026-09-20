"use client";

import { api } from "@/lib/api";
import type { AdminApi } from "@/contracts/admin";

export function getAdminMilestoneApi(): AdminApi {
  return api.admin;
}
