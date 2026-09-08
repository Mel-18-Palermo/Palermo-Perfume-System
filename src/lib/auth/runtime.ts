import "server-only";
import { getDatabase } from "../db";
import { IdentityService } from "../../modules/identity/service";
import { createSupabaseIdentityProvider } from "./supabase";

export function getIdentityService(): IdentityService {
  return new IdentityService(getDatabase(), createSupabaseIdentityProvider());
}
