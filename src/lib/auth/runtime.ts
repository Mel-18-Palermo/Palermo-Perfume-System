import "server-only";
import { getDatabase } from "../db";
import { IdentityService } from "../../modules/identity/service";
import { createSupabaseIdentityProvider } from "./supabase";
import { createE2EIdentityProvider, e2eIdentityProviderEnabled } from "./e2e-provider";

export function getIdentityService(): IdentityService {
  return new IdentityService(getDatabase(), e2eIdentityProviderEnabled() ? createE2EIdentityProvider() : createSupabaseIdentityProvider());
}
