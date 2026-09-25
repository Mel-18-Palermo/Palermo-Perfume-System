import "server-only";

import { getDatabase } from "../../../lib/db";
import {
  PromotionalContentService,
  type PromotionalVideoProvider,
} from "./service";

const unavailableProvider: PromotionalVideoProvider = {
  generate: async () => {
    throw new Error("Promotional video provider is not configured.");
  },
};

export function getPromotionalContentService(): PromotionalContentService {
  return new PromotionalContentService(getDatabase(), unavailableProvider);
}
