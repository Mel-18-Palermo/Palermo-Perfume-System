import "server-only";

import { getDiscoveryService } from "../../modules/discovery/runtime";
import { configuredOpenAIRecommendationProvider } from "./openai-provider";
import { AiRecommendationService } from "./service";

const OPENAI_RECOMMENDATION_TIMEOUT_MS = 8_000;

export function getAiRecommendationService(): AiRecommendationService {
  return new AiRecommendationService(
    getDiscoveryService(),
    configuredOpenAIRecommendationProvider(),
    OPENAI_RECOMMENDATION_TIMEOUT_MS,
  );
}
