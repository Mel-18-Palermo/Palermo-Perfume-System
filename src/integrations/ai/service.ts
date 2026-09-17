import { randomUUID } from "node:crypto";
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
  if (!Object.hasOwn(root, "recommendations")) return null;
  const recommendations = root["recommendations"];
  if (!Array.isArray(recommendations) || recommendations.length === 0 || recommendations.length > 12) return null;
  const parsed: ProviderRecommendation[] = [];
  for (const item of recommendations) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const record = item as Record<string, unknown>;
    if (Object.keys(record).sort().join(",") !== "perfumeId,reason") return null;
    const perfumeId = record["perfumeId"];
    const reason = record["reason"];
    if (typeof perfumeId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(perfumeId)
      || typeof reason !== "string" || reason.trim().length === 0 || reason.length > 500
      || /\b(cure|treat|diagnos|medical|pregnan|\d+\s+hours?|longevity\s+hours?|projection\s+percent|match\s+percent|\d+\s*%)\b/i.test(reason)) return null;
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
    private readonly now: () => Date = () => new Date(),
  ) {}

  async recommend(input: RecommendationRequest): Promise<ApiResult<AiRecommendationServiceResult>> {
    const context = await this.discovery.getCandidateContext(input);
    if (!context.ok) return fallbackResult(this.discovery, input);
    const redacted = contextForProvider(input, context.data);
    let raw: unknown;
    try {
      raw = await Promise.race([
        this.provider.recommend(redacted),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("provider-timeout")), this.timeoutMs)),
      ]);
    } catch {
      return fallbackResult(this.discovery, input);
    }
    const parsed = providerOutput(raw);
    if (!parsed) return fallbackResult(this.discovery, input);
    const candidates = new Map(context.data.candidates.map(candidate => [candidate.perfume.id, candidate] as const));
    if (parsed.recommendations.some(item => !candidates.has(item.perfumeId))) return fallbackResult(this.discovery, input);
    const generatedAt = this.now().toISOString();
    const items = parsed.recommendations.map(item => {
      const candidate = candidates.get(item.perfumeId);
      if (!candidate) throw new Error("validated candidate missing");
      return { perfumeId: candidate.perfume.id, perfume: candidate.perfume, reason: item.reason };
    });
    return success({ provider: "AI", result: { runId: randomUUID(), items, generatedAt, fallback: false } });
  }
}
