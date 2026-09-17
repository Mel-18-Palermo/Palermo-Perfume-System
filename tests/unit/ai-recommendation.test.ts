import { describe, expect, it, vi } from "vitest";
import type { RecommendationRequest, RecommendationResult } from "../../src/contracts/recommendations";
import type { ApiResult } from "../../src/contracts/common";
import type { CandidateContext } from "../../src/modules/discovery/types";
import { AiRecommendationService } from "../../src/integrations/ai/service";
import type { DiscoveryRecommendationBoundary, RecommendationProvider, RedactedRecommendationContext } from "../../src/integrations/ai/contracts";
import { DeterministicRecommendationProvider } from "../../src/integrations/ai/mock-provider";

const ids = { quiz: "24200000-0000-4000-8000-000000000060", question: "24200000-0000-4000-8000-000000000061", option: "24200000-0000-4000-8000-000000000062", perfume: "24200000-0000-4000-8000-000000000013" } as const;
const candidate = {
  perfume: { id: ids.perfume, slug: "demo-citrus", name: "Demo Citrus", primaryFamily: { id: "24200000-0000-4000-8000-000000000010", label: "Citrus" }, imageUrl: null, priceFrom: { amountMinor: 12000, currency: "AUD" }, intensity: null },
  notes: [], suitability: { occasion: [], mood: [], weather: [], daypart: [], season: [] },
} as const;
const context: CandidateContext = {
  quizId: ids.quiz, quizVersion: "1", selectedFamilies: [], selectedIntensities: [], selectedNotes: [],
  selectedSuitability: { occasion: [], mood: [], weather: [], daypart: [], season: [] }, candidates: [candidate],
};
const request: RecommendationRequest = { quizId: ids.quiz, quizVersion: "1", answers: [{ questionId: ids.question, optionIds: [ids.option] }] };
const fallback: RecommendationResult = { runId: "24200000-0000-4000-8000-000000000099", items: [{ perfumeId: ids.perfume, perfume: candidate.perfume, reason: "Deterministic match" }], generatedAt: "2026-09-18T00:00:00.000Z", fallback: true };

function discovery(): DiscoveryRecommendationBoundary {
  return { getCandidateContext: vi.fn(async () => ({ ok: true, data: context }) as ApiResult<CandidateContext>), generate: vi.fn(async () => ({ ok: true, data: fallback }) as ApiResult<RecommendationResult>) };
}

describe("replaceable AI recommendation boundary", () => {
  it("accepts injected provider output only for supplied candidates", async () => {
    let supplied: RedactedRecommendationContext | undefined;
    const provider: RecommendationProvider = { recommend: async value => { supplied = value; return { recommendations: [{ perfumeId: ids.perfume, reason: "Grounded catalogue explanation" }] }; } };
    const result = await new AiRecommendationService(discovery(), provider, 100, () => new Date("2026-09-18T00:00:00.000Z")).recommend(request);
    expect(result).toMatchObject({ ok: true, data: { provider: "AI", result: { fallback: false, items: [{ perfumeId: ids.perfume }] } } });
    expect(Object.keys(supplied ?? {})).toEqual(["quiz", "preferences", "candidates"]);
    expect(JSON.stringify(supplied)).not.toMatch(/account|address|payment|order|support|stock/i);
  });

  it.each([
    ["malformed output", {}, 100],
    ["unknown perfume", { recommendations: [{ perfumeId: "24200000-0000-4000-8000-000000000999", reason: "Unknown" }] }, 100],
    ["unsupported field", { recommendations: [{ perfumeId: ids.perfume, reason: "Grounded", percentage: 99 }] }, 100],
    ["unsupported claim", { recommendations: [{ perfumeId: ids.perfume, reason: "Guaranteed 12 hours longevity" }] }, 100],
  ])("falls back for %s", async (_name, output, timeout) => {
    const d = discovery();
    const result = await new AiRecommendationService(d, new DeterministicRecommendationProvider(output), timeout).recommend(request);
    expect(result).toMatchObject({ ok: true, data: { provider: "DETERMINISTIC", result: { fallback: true } } });
    expect(d.generate).toHaveBeenCalledWith(request);
  });

  it("falls back on timeout, transport rejection and thrown provider errors", async () => {
    const providers: RecommendationProvider[] = [
      { recommend: () => new Promise(() => undefined) },
      { recommend: async () => { throw new Error("transport"); } },
      { recommend: async () => { throw new TypeError("provider"); } },
    ];
    for (const provider of providers) {
      const d = discovery();
      await expect(new AiRecommendationService(d, provider, 5).recommend(request)).resolves.toMatchObject({ ok: true, data: { provider: "DETERMINISTIC" } });
    }
  });

  it("keeps deterministic mock output bounded and proves no commerce authority", async () => {
    const d = discovery();
    const result = await new AiRecommendationService(d, new DeterministicRecommendationProvider(), 100).recommend(request);
    expect(result).toMatchObject({ ok: true, data: { provider: "AI", result: { items: [{ perfume: { priceFrom: { amountMinor: 12000 } } }] } } });
    expect(d.generate).not.toHaveBeenCalled();
    const price = result.ok ? result.data.result.items[0]?.perfume.priceFrom.amountMinor : null;
    expect(price).toBe(12000);
  });
});
