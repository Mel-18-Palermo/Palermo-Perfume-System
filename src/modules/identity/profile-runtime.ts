import "server-only";
import { getDatabase } from "../../lib/db";
import { ProfileService } from "./profile-service";

export function getProfileService(): ProfileService { return new ProfileService(getDatabase()); }
