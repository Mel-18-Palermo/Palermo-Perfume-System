import type { ApiResult, EntityId, Option, Timestamp } from "../../contracts/common";
import type { RecommendationRequest, RecommendationResult } from "../../contracts/recommendations";
import type { CandidateRecord, CandidateContext } from "../../modules/discovery/types";

export type RedactedRecommendationContext = Readonly<{
  quiz: Readonly<{
    id: EntityId;
    version: string;
    answers: readonly Readonly<{ questionId: EntityId; optionIds: readonly EntityId[] }>[];
  }>;
  preferences: Readonly<{
    families: readonly Option[];
    intensities: readonly Option[];
    notes: readonly Option[];
    suitability: CandidateContext["selectedSuitability"];
  }>;
  candidates: readonly CandidateRecord[];
}>;

export type ProviderRecommendation = Readonly<{ perfumeId: EntityId; reason: string }>;
export type ProviderOutput = Readonly<{ recommendations: readonly ProviderRecommendation[] }>;
export type ProviderResponse = Readonly<{ output: unknown; providerReference: string | null }>;

export type RecommendationProvider = Readonly<{
  recommend(
    context: RedactedRecommendationContext,
    signal?: AbortSignal,
  ): Promise<ProviderResponse>;
}>;

export type AiRecommendationServiceResult = Readonly<{
  result: RecommendationResult;
  provider: "AI" | "DETERMINISTIC";
}>;

export type DiscoveryRecommendationBoundary = Readonly<{
  getCandidateContext(input: RecommendationRequest): Promise<ApiResult<CandidateContext>>;
  generate(input: RecommendationRequest): Promise<ApiResult<RecommendationResult>>;
  persistProviderRecommendations(
    input: RecommendationRequest,
    recommendations: readonly ProviderRecommendation[],
    providerReference: string | null,
  ): Promise<ApiResult<RecommendationResult>>;
}>;

export type ProviderClock = () => Date;
export type ProviderTimeoutMs = number;

export type ProviderContextSchema = Readonly<{
  allowedRootKeys: readonly ["quiz", "preferences", "candidates"];
  candidateFields: readonly ["perfume", "notes", "suitability"];
  prohibitedFields: readonly ["account", "addresses", "payments", "orders", "support", "stockMutation"];
}>;

export const redactedContextSchema: ProviderContextSchema = {
  allowedRootKeys: ["quiz", "preferences", "candidates"],
  candidateFields: ["perfume", "notes", "suitability"],
  prohibitedFields: ["account", "addresses", "payments", "orders", "support", "stockMutation"],
};

export type AiResultTimestamp = Timestamp;
