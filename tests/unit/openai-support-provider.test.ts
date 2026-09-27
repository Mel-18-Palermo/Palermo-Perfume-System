import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  configuredOpenAISupportProvider,
  OpenAISupportProvider,
} from "../../src/integrations/ai/openai-support-provider";

const supportInput = {
  intent: "ORDER" as const,
  message: "Where is my order?",
  context: {
    order: {
      orderNumber: "PAL-273",
      status: "SHIPPED",
      shipment: { status: "IN_TRANSIT", trackingReference: "TRACK-273" },
    },
  },
};

function completedResponse(text: string): Response {
  return new Response(JSON.stringify({
    id: "resp_support_123",
    status: "completed",
    output: [{ type: "message", content: [{ type: "output_text", text }] }],
  }), { status: 200, headers: { "content-type": "application/json" } });
}

describe("OpenAI support provider", () => {
  it("sends only authorised support context with no tools or provider persistence", async () => {
    const fetcher = vi.fn<(
      input: string | URL | Request,
      init?: RequestInit,
    ) => Promise<Response>>(async () => completedResponse("Your authorised order is marked shipped."));
    const provider = new OpenAISupportProvider("sk-test-secret", "test-model", fetcher);

    await expect(provider.respond(supportInput)).resolves.toBe("Your authorised order is marked shipped.");
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer sk-test-secret");

    const rawBody = String(init?.body);
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    expect(body["model"]).toBe("test-model");
    expect(body["store"]).toBe(false);
    expect(body["tools"]).toEqual([]);
    expect(body["max_output_tokens"]).toBe(600);
    expect(rawBody).not.toContain("sk-test-secret");
    expect(String(body["instructions"])).toMatch(/Never claim to have taken/);
    expect(String(body["instructions"])).toMatch(/Do not fabricate/);

    expect(JSON.parse(String(body["input"]))).toEqual(supportInput);
    expect(String(body["input"])).not.toContain("customerId");
    expect(String(body["input"])).not.toMatch(/payment\.refund|order\.cancel|inventory\.mutate/);
  });

  it.each([
    ["empty output", ""],
    ["oversized output", "x".repeat(4_001)],
  ])("rejects %s", async (_name, text) => {
    const provider = new OpenAISupportProvider("sk-test-secret", "test-model", async () => completedResponse(text));
    await expect(provider.respond(supportInput)).rejects.toThrow("valid concise text reply");
  });

  it("fails closed on provider HTTP failure without exposing the response body", async () => {
    const provider = new OpenAISupportProvider("sk-test-secret", "test-model", async () => new Response(JSON.stringify({ error: { message: "sensitive provider diagnostic" } }), { status: 503 }));
    await expect(provider.respond(supportInput)).rejects.toThrow("OpenAI support request failed with HTTP 503.");
    try {
      await provider.respond(supportInput);
    } catch (error) {
      expect(String(error)).not.toContain("sensitive provider diagnostic");
      expect(String(error)).not.toContain("sk-test-secret");
    }
  });

  it("fails closed when the runtime configuration is incomplete", async () => {
    await expect(configuredOpenAISupportProvider({}).respond(supportInput)).rejects.toThrow("not configured");
    await expect(configuredOpenAISupportProvider({ OPENAI_API_KEY: "sk-test-secret" }).respond(supportInput)).rejects.toThrow("not configured");
    await expect(configuredOpenAISupportProvider({ OPENAI_MODEL: "test-model" }).respond(supportInput)).rejects.toThrow("not configured");
  });
});
