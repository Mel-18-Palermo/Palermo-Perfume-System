import type { ProviderResponse, RecommendationProvider, RedactedRecommendationContext } from "./contracts";

/** Deterministic injected test double. It never calls a provider or a network. */
export class DeterministicRecommendationProvider implements RecommendationProvider {
  constructor(
    private readonly output?: unknown,
    private readonly delayMs = 0,
    private readonly providerReference: string | null = null,
  ) {}

  async recommend(context: RedactedRecommendationContext): Promise<ProviderResponse> {
    if (this.delayMs > 0) await new Promise(resolve => setTimeout(resolve, this.delayMs));
    return {
      providerReference: this.providerReference,
      output: this.output !== undefined ? this.output : {
        recommendations: context.candidates.slice(0, 2).map(candidate => ({
          perfumeId: candidate.perfume.id,
          reason: "A bounded deterministic provider example grounded in the supplied catalogue candidate.",
        })),
      },
    };
  }
}
