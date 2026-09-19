import "server-only";

import type {
  ProviderResponse,
  RecommendationProvider,
  RedactedRecommendationContext,
} from "./contracts";

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const recommendationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    recommendations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          perfumeId: {
            type: "string",
          },
          reason: {
            type: "string",
          },
        },
        required: ["perfumeId", "reason"],
      },
    },
  },
  required: ["recommendations"],
} as const;

const instructions = [
  "You are Palermo's bounded fragrance recommendation ranking service.",
  "You receive only a pre-approved quiz context and a bounded set of Palermo catalogue candidates.",
  "Recommend only perfume IDs that appear in the supplied candidates.",
  "Do not invent products, prices, availability, notes, performance measurements, percentages, medical claims, or catalogue facts.",
  "Do not make health, pregnancy, allergy, diagnosis, treatment, or safety claims.",
  "Use the supplied quiz preferences and catalogue attributes only.",
  "Return concise reasons explaining why each selected candidate relates to the supplied preferences.",
  "Do not include any fields outside the required structured response.",
].join(" ");

function objectRecord(
  value: unknown,
): Record<string, unknown> | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as Record<string, unknown>;
}

function responseOutputText(
  value: unknown,
): string | null {
  const root = objectRecord(value);

  if (!root || root["status"] !== "completed") {
    return null;
  }

  const output = root["output"];

  if (!Array.isArray(output)) {
    return null;
  }

  const texts: string[] = [];

  for (const rawItem of output) {
    const item = objectRecord(rawItem);

    if (
      !item ||
      item["type"] !== "message" ||
      !Array.isArray(item["content"])
    ) {
      continue;
    }

    for (const rawContent of item["content"]) {
      const content = objectRecord(rawContent);

      if (
        content?.["type"] === "output_text" &&
        typeof content["text"] === "string"
      ) {
        texts.push(content["text"]);
      }
    }
  }

  /*
   * A strict structured-output response should produce one logical JSON text
   * result. Multiple independent text payloads are treated as invalid rather
   * than guessed or concatenated.
   */
  if (texts.length !== 1) {
    return null;
  }

  return texts[0] ?? null;
}

function providerReference(
  value: unknown,
): string | null {
  const root = objectRecord(value);
  const id = root?.["id"];

  if (
    typeof id !== "string" ||
    id.length === 0 ||
    id.length > 255
  ) {
    return null;
  }

  return id;
}

export class OpenAIRecommendationProvider
  implements RecommendationProvider
{
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetcher: FetchLike = fetch,
  ) {
    if (!apiKey.trim()) {
      throw new Error(
        "OpenAI recommendation provider requires an API key.",
      );
    }

    if (!model.trim()) {
      throw new Error(
        "OpenAI recommendation provider requires a model.",
      );
    }
  }

  async recommend(
    context: RedactedRecommendationContext,
    signal?: AbortSignal,
  ): Promise<ProviderResponse> {
    const response = await this.fetcher(
      OPENAI_RESPONSES_URL,
      {
        method: "POST",
        signal: signal ?? null,

        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },

        body: JSON.stringify({
          model: this.model,

          /*
           * Palermo does not require provider-side conversation persistence.
           * Every recommendation request is independently reconstructible from
           * authoritative Palermo state.
           */
          store: false,

          instructions,

          input: JSON.stringify(context),

          max_output_tokens: 1_500,

          /*
           * No tools are available to the recommendation model.
           *
           * It cannot query Palermo, browse the web, mutate commerce state, or
           * invoke arbitrary application functionality.
           */
          tools: [],

          text: {
            format: {
              type: "json_schema",
              name: "palermo_recommendations",
              description:
                "A ranked selection of perfume IDs from the supplied Palermo candidate set.",
              strict: true,
              schema: recommendationSchema,
            },
          },
        }),
      },
    );

    /*
     * Never include provider response bodies in thrown errors. They may contain
     * generated content or provider diagnostics that do not belong in logs.
     */
    if (!response.ok) {
      throw new Error(
        `OpenAI recommendation request failed with HTTP ${response.status}.`,
      );
    }

    const raw: unknown = await response.json();

    const reference = providerReference(raw);

    if (!reference) {
      throw new Error(
        "OpenAI recommendation response did not contain a valid response identifier.",
      );
    }

    const text = responseOutputText(raw);

    if (!text) {
      /*
       * Refusals, incomplete responses and unexpected response shapes all fall
       * through the existing deterministic Palermo fallback.
       */
      throw new Error(
        "OpenAI recommendation response did not contain completed structured output.",
      );
    }

    let output: unknown;

    try {
      output = JSON.parse(text) as unknown;
    } catch {
      throw new Error(
        "OpenAI recommendation response contained invalid JSON.",
      );
    }

    return {
      output,
      providerReference: reference,
    };
  }
}

class UnavailableRecommendationProvider
  implements RecommendationProvider
{
  async recommend(
  ): Promise<ProviderResponse> {
    throw new Error(
      "OpenAI recommendation provider is not configured.",
    );
  }
}

export function configuredOpenAIRecommendationProvider(
  environment: Readonly<
    Record<string, string | undefined>
  > = process.env,
  fetcher: FetchLike = fetch,
): RecommendationProvider {
  const apiKey =
    environment["OPENAI_API_KEY"]?.trim();

  const model =
    environment["OPENAI_MODEL"]?.trim();

  if (!apiKey || !model) {
    return new UnavailableRecommendationProvider();
  }

  return new OpenAIRecommendationProvider(
    apiKey,
    model,
    fetcher,
  );
}
