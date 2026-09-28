import "server-only";

import { getDatabase } from "../../../lib/db";
import { ReviewService } from "./service";

export function getReviewService(): ReviewService {
  return new ReviewService(getDatabase());
}
