import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import type { RedactedRecommendationContext } from "../../src/integrations/ai/contracts";
import {
  configuredOpenAIRecommendationProvider,
  OpenAIRecommendationProvider,
} from "../../src/integrations/ai/openai-provider";

const perfumeId = "24200000-0000-4000-8000-000000000013";

const context: RedactedRecommendationContext = {
  quiz: {
    id: "24200000-0000-4000-8000-000000000060",
    version: "1",
    answers: [
      {
        questionId: "24200000-0000-4000-8000-000000000061",
        optionIds: [
          "24200000-0000-4000-8000-000000000062",
        ],
      },
    ],
  },

  preferences: {
    families: [],
    intensities: [],
    notes: [],
    suitability: {
      occasion: [],
      mood: [],
      weather: [],
      daypart: [],
      season: [],
    },
  },

  candidates: [
    {
      perfume: {
        id: perfumeId,
        slug: "demo-citrus",
        name: "Demo Citrus",
        primaryFamily: {
          id: "24200000-0000-4000-8000-000000000010",
          label: "Citrus",
        },
        imageUrl: null,
        priceFrom: {
          amountMinor: 12000,
          currency: "AUD",
        },
        intensity: null,
      },

      notes: [],

      suitability: {
        occasion: [],
        mood: [],
        weather: [],
        daypart: [],
        season: [],
      },
    },
  ],
};

function completedResponse(
  output: unknown,
  id = "resp_test_123",
): Response {
  return new Response(
    JSON.stringify({
      id,
      status: "completed",
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: JSON.stringify(output),
            },
          ],
        },
      ],
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    },
  );
}

describe("OpenAI recommendation provider", () => {
  it("sends only the bounded context using strict structured output", async () => {
    const fetcher = vi.fn<
      (
        input: string | URL | Request,
        init?: RequestInit,
      ) => Promise<Response>
    >(
      async () =>
        completedResponse({
          recommendations: [
            {
              perfumeId,
              reason: "Matches the supplied citrus preference.",
            },
          ],
        }),
    );

    const provider = new OpenAIRecommendationProvider(
      "sk-test-secret",
      "test-model",
      fetcher,
    );

    const controller = new AbortController();
    const result = await provider.recommend(
      context,
      controller.signal,
    );

    expect(result).toEqual({
      providerReference: "resp_test_123",
      output: {
        recommendations: [
          {
            perfumeId,
            reason: "Matches the supplied citrus preference.",
          },
        ],
      },
    });

    expect(fetcher).toHaveBeenCalledTimes(1);

    const call = fetcher.mock.calls[0];

    expect(call).toBeDefined();

    if (!call) {
      throw new Error("Expected OpenAI fetch invocation.");
    }

    const [url, init] = call;

    expect(url).toBe(
      "https://api.openai.com/v1/responses",
    );

    expect(init?.method).toBe("POST");
    expect(init?.signal).toBe(controller.signal);

    const headers = new Headers(init?.headers);

    expect(headers.get("authorization")).toBe(
      "Bearer sk-test-secret",
    );

    expect(headers.get("content-type")).toBe(
      "application/json",
    );

    expect(typeof init?.body).toBe("string");

    const rawBody = String(init?.body);
    const body = JSON.parse(rawBody) as Record<
      string,
      unknown
    >;

    expect(body["model"]).toBe("test-model");
    expect(body["store"]).toBe(false);
    expect(body["tools"]).toEqual([]);

    expect(body["text"]).toMatchObject({
      format: {
        type: "json_schema",
        name: "palermo_recommendations",
        strict: true,
      },
    });

    /*
     * Credentials belong only in the Authorization header.
     */
    expect(rawBody).not.toContain("sk-test-secret");

    /*
     * The provider gets the approved redacted context only.
     */
    const input = JSON.parse(
      String(body["input"]),
    ) as Record<string, unknown>;

    expect(Object.keys(input)).toEqual([
      "quiz",
      "preferences",
      "candidates",
    ]);

    expect(JSON.stringify(input)).not.toMatch(
      /account|address|payment|order|support|stockMutation/i,
    );
  });

  it("rejects refusal content instead of treating it as recommendations", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: "resp_refusal",
            status: "completed",
            output: [
              {
                type: "message",
                content: [
                  {
                    type: "refusal",
                    refusal: "Cannot comply.",
                  },
                ],
              },
            ],
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
    );

    const provider = new OpenAIRecommendationProvider(
      "sk-test-secret",
      "test-model",
      fetcher,
    );

    await expect(
      provider.recommend(context),
    ).rejects.toThrow(
      "did not contain completed structured output",
    );
  });

  it("rejects malformed structured JSON", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: "resp_bad_json",
            status: "completed",
            output: [
              {
                type: "message",
                content: [
                  {
                    type: "output_text",
                    text: "{not-json",
                  },
                ],
              },
            ],
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
    );

    const provider = new OpenAIRecommendationProvider(
      "sk-test-secret",
      "test-model",
      fetcher,
    );

    await expect(
      provider.recommend(context),
    ).rejects.toThrow(
      "contained invalid JSON",
    );
  });

  it("fails closed on rate limiting without exposing the response body", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              message: "sensitive provider diagnostic",
            },
          }),
          {
            status: 429,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
    );

    const provider = new OpenAIRecommendationProvider(
      "sk-test-secret",
      "test-model",
      fetcher,
    );

    await expect(
      provider.recommend(context),
    ).rejects.toThrow(
      "OpenAI recommendation request failed with HTTP 429.",
    );

    try {
      await provider.recommend(context);
    } catch (error) {
      expect(String(error)).not.toContain(
        "sensitive provider diagnostic",
      );

      expect(String(error)).not.toContain(
        "sk-test-secret",
      );
    }
  });

  it("propagates transport failure to the application fallback boundary", async () => {
    const fetcher = vi.fn(
      async (): Promise<Response> => {
        throw new TypeError("network unavailable");
      },
    );

    const provider = new OpenAIRecommendationProvider(
      "sk-test-secret",
      "test-model",
      fetcher,
    );

    await expect(
      provider.recommend(context),
    ).rejects.toThrow("network unavailable");
  });

  it("is unavailable when OpenAI runtime configuration is incomplete", async () => {
    const missing = configuredOpenAIRecommendationProvider(
      {},
    );

    const missingModel =
      configuredOpenAIRecommendationProvider({
        OPENAI_API_KEY: "sk-test-secret",
      });

    const missingKey =
      configuredOpenAIRecommendationProvider({
        OPENAI_MODEL: "test-model",
      });

    await expect(
      missing.recommend(context),
    ).rejects.toThrow("not configured");

    await expect(
      missingModel.recommend(context),
    ).rejects.toThrow("not configured");

    await expect(
      missingKey.recommend(context),
    ).rejects.toThrow("not configured");
  });
});
