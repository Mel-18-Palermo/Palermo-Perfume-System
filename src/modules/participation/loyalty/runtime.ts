import "server-only";

import { getDatabase } from "../../../lib/db";
import { ParticipationService } from "./service";

export function getParticipationService(): ParticipationService {
  return new ParticipationService(getDatabase());
}
