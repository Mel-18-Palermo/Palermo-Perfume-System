import type { RecommendationRequest } from "../../contracts/recommendations";
import type { ApiResult } from "../../contracts/common";
import { success } from "../../lib/api/result";
import type { CandidateContext } from "../../modules/discovery/types";
import type { AiRecommendationServiceResult, DiscoveryRecommendationBoundary, ProviderOutput, ProviderRecommendation, ProviderTimeoutMs, RecommendationProvider, RedactedRecommendationContext } from "./contracts";

const fallbackResult = async (discovery: DiscoveryRecommendationBoundary, input: RecommendationRequest): Promise<ApiResult<AiRecommendationServiceResult>> => {
  const result = await discovery.generate(input);
  return result.ok ? success({ result: result.data, provider: "DETERMINISTIC" }) : result;
};

function providerOutput(value: unknown): ProviderOutput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const root = value as Record<string, unknown>;
  if (Object.keys(root).sort().join(",") !== "recommendations") return null;
  const recommendations = root["recommendations"];
  if (!Array.isArray(recommendations) || recommendations.length === 0 || recommendations.length > 12) return null;

  const parsed: ProviderRecommendation[] = [];
  const seen = new Set<string>();
  for (const item of recommendations) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const record = item as Record<string, unknown>;
    if (Object.keys(record).sort().join(",") !== "perfumeId,reason") return null;
    const perfumeId = record["perfumeId"];
    const reason = record["reason"];
    if (typeof perfumeId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(perfumeId)
      || typeof reason !== "string" || reason.trim().length === 0 || reason.length > 500
      || /\b(cure|treat|diagnos|medical|pregnan|\d+\s+hours?|longevity\s+hours?|projection\s+percent|match\s+percent|\d+\s*%)\b/i.test(reason)
      || seen.has(perfumeId)) return null;
    seen.add(perfumeId);
    parsed.push({ perfumeId, reason: reason.trim() });
  }
  return { recommendations: parsed };
}

function contextForProvider(input: RecommendationRequest, context: CandidateContext): RedactedRecommendationContext {
  return {
    quiz: { id: context.quizId, version: context.quizVersion, answers: input.answers.map(answer => ({ questionId: answer.questionId, optionIds: [...answer.optionIds] })) },
    preferences: {
      families: context.selectedFamilies, intensities: context.selectedIntensities,
      notes: context.selectedNotes, suitability: context.selectedSuitability,
    },
    candidates: context.candidates,
  };
}

export class AiRecommendationService {
  constructor(
    private readonly discovery: DiscoveryRecommendationBoundary,
    private readonly provider: RecommendationProvider,
    private readonly timeoutMs: ProviderTimeoutMs = 1_500,
  ) {}

  async recommend(input: RecommendationRequest): Promise<ApiResult<AiRecommendationServiceResult>> {
    const context = await this.discovery.getCandidateContext(input);
    if (!context.ok) return fallbackResult(this.discovery, input);

    const redacted = contextForProvider(input, context.data);
    const controller = new AbortController();
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    let response: Awaited<ReturnType<RecommendationProvider["recommend"]>>;

    try {
      const timeout = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          controller.abort();
          reject(new Error("provider-timeout"));
        }, this.timeoutMs);
      });
      response = await Promise.race([this.provider.recommend(redacted, controller.signal), timeout]);
    } catch {
      return fallbackResult(this.discovery, input);
    } finally {
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
    }

    const parsed = providerOutput(response.output);
    if (!parsed) return fallbackResult(this.discovery, input);

    const candidateIds = new Set(context.data.candidates.map(candidate => candidate.perfume.id));
    if (parsed.recommendations.some(item => !candidateIds.has(item.perfumeId))) return fallbackResult(this.discovery, input);

    const persisted = await this.discovery.persistProviderRecommendations(
      input,
      parsed.recommendations,
      response.providerReference,
    );
    if (!persisted.ok) return fallbackResult(this.discovery, input);

    return success({ provider: "AI", result: persisted.data });
  }
}
