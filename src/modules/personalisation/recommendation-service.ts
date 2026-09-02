export interface QuizAnswersPayload {
  scentProfile: string;
  intensity: string;
  occasion: string;
}

export interface RecommendationContractResult {
  id: string;
  name: string;
  concentration: string;
  family: string;
  matchScore: number;
  description: string;
  dominantNotes: string[];
  suggestedOccasion: string;
  price: number;
  reasoning: string;
}

export interface RecommendationContractResponse {
  source: "AI_LIVE_ADAPTER" | "DETERMINISTIC_FALLBACK";
  advisoryMessage?: string;
  recommendations: RecommendationContractResult[];
}

const CATALOGUE_FALLBACK_RECOMMENDATIONS: Record<string, RecommendationContractResult[]> = {
  citrus: [
    {
      id: "rec_1",
      name: "Santorini Mist",
      concentration: "Extrait de Parfum",
      family: "Citrus Mineral",
      matchScore: 98,
      description: "Sun-drenched Calabrian bergamot infused with marine salt and crisp sea spray notes.",
      dominantNotes: ["Calabrian Bergamot", "Sicilian Lemon", "Marine Salt"],
      suggestedOccasion: "Daylight Elegance & Summer Days",
      price: 120.0,
      reasoning: "Selected based on preference for bright citrus profiles and natural marine fresh sillage.",
    },
    {
      id: "rec_2",
      name: "Neroli Blanc",
      concentration: "Eau de Parfum",
      family: "Citrus Floral",
      matchScore: 92,
      description: "Crisp white neroli petals anchored by sweet orange blossom and sparkling white musk.",
      dominantNotes: ["Tunisian Neroli", "Sweet Orange", "White Musk"],
      suggestedOccasion: "Universal Signature",
      price: 115.0,
      reasoning: "Pairs delicate neroli blossoms with crisp daytime elegance.",
    },
  ],
  floral: [
    {
      id: "rec_3",
      name: "Velvet Damask",
      concentration: "Extrait de Parfum",
      family: "Floral Oriental",
      matchScore: 96,
      description: "Opulent Turkish damask rose kissed with pink peppercorn and velvety jasmine sambac.",
      dominantNotes: ["Damask Rose", "Pink Pepper", "Jasmine Sambac"],
      suggestedOccasion: "Evening & Formal Events",
      price: 145.0,
      reasoning: "Matches desired projection with multi-layered damask florals and warm pepper depth.",
    },
  ],
  woody: [
    {
      id: "rec_4",
      name: "Oud Royale",
      concentration: "Extrait de Parfum",
      family: "Woody Oriental",
      matchScore: 99,
      description: "Precious dark agarwood layered with smoked Atlas cedar and rich golden amber resin.",
      dominantNotes: ["Smoky Agarwood", "Atlas Cedar", "Golden Amber"],
      suggestedOccasion: "Nocturne & Evening Gala",
      price: 180.0,
      reasoning: "Optimized for bold projection and rich, deep resinous woody bases.",
    },
    {
      id: "rec_5",
      name: "Cypress Noir",
      concentration: "Eau de Parfum",
      family: "Woody Aromatic",
      matchScore: 89,
      description: "Aromatic Mediterranean cypress needle blended with Haitian vetiver and dark pine resin.",
      dominantNotes: ["Cypress Needle", "Haitian Vetiver", "Smoked Pine"],
      suggestedOccasion: "All-Day Signature",
      price: 150.0,
      reasoning: "Delivers an earthy, aromatic green woody impression suited for balanced projection.",
    },
  ],
  oriental: [
    {
      id: "rec_6",
      name: "Ambre Nuit",
      concentration: "Extrait de Parfum",
      family: "Warm Amber",
      matchScore: 97,
      description: "Lush Bourbon vanilla and Tonka bean laced with warm benzoin resin and golden honey.",
      dominantNotes: ["Bourbon Vanilla", "Tonka Bean", "Benzoin Resin"],
      suggestedOccasion: "Evening & Intimate Nights",
      price: 160.0,
      reasoning: "Matches preferences for rich amber sweetness, bourbon vanilla, and intimate skin warmth.",
    },
  ],
};

const DEFAULT_FALLBACK = CATALOGUE_FALLBACK_RECOMMENDATIONS.citrus ?? [];

export async function fetchFragranceRecommendations(
  payload: QuizAnswersPayload,
  forceFailureMode: boolean = false
): Promise<RecommendationContractResponse> {
  // Simulate network request roundtrip
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (forceFailureMode) {
    throw new Error("AI_PROVIDER_UNREACHABLE");
  }

  const normalizedProfile = payload.scentProfile.toLowerCase();
  const matched = CATALOGUE_FALLBACK_RECOMMENDATIONS[normalizedProfile] ?? DEFAULT_FALLBACK;

  return {
    source: "AI_LIVE_ADAPTER",
    recommendations: matched,
  };
}

export function getDeterministicFallbackRecommendations(
  payload: QuizAnswersPayload
): RecommendationContractResponse {
  const normalizedProfile = payload.scentProfile.toLowerCase();
  const matched = CATALOGUE_FALLBACK_RECOMMENDATIONS[normalizedProfile] ?? DEFAULT_FALLBACK;

  return {
    source: "DETERMINISTIC_FALLBACK",
    advisoryMessage:
      "Recommendation generated using approved deterministic catalogue rules while live AI refinement is offline.",
    recommendations: matched,
  };
}