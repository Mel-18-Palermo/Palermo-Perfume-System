import type { RecommendationProvider, RedactedRecommendationContext } from "./contracts";

/** Deterministic injected test double. It never calls a provider or a network. */
export class DeterministicRecommendationProvider implements RecommendationProvider {
  constructor(private readonly output?: unknown, private readonly delayMs = 0) {}

  async recommend(context: RedactedRecommendationContext): Promise<unknown> {
    if (this.delayMs > 0) await new Promise(resolve => setTimeout(resolve, this.delayMs));
    if (this.output !== undefined) return this.output;
    return { recommendations: context.candidates.slice(0, 2).map(candidate => ({
      perfumeId: candidate.perfume.id,
      reason: "A bounded deterministic provider example grounded in the supplied catalogue candidate.",
    })) };
  }
}
