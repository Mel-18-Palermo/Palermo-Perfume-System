import "server-only";

import type { SupportProvider } from "../../modules/support/service";

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const MAX_REPLY_LENGTH = 4_000;

const instructions = [
  "You are Palermo's bounded support assistant.",
  "Answer only from the customer message and the authorised Palermo context supplied in this request.",
  "The server, not you, assembled this context. Do not request, select, infer, or use any other Palermo record, order ID, account detail, API, tool, website, or external source.",
  "You provide information only. Never claim to have taken, scheduled, approved, completed, or initiated an action.",
  "Never refund, charge, take payment, change an order, change delivery, reserve or change inventory, or promise that another person will do so.",
  "Do not fabricate or speculate about products, policy, orders, delivery, payment, availability, pricing, ingredients, performance, health, allergy, pregnancy, medical, or safety facts.",
  "For product or policy questions without supplied facts, explain the limit and direct the customer to Palermo's published product or policy information.",
  "For order or delivery questions, describe only the authorised order context supplied by Palermo. Do not infer missing status or tracking details.",
  "Do not ask for payment-card details, passwords, or authentication codes.",
  "Be concise, plain-language, and helpful. Return text only.",
].join(" ");

function objectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function responseOutputText(value: unknown): string | null {
  const root = objectRecord(value);
  const output = root?.["output"];
  if (!Array.isArray(output)) return null;

  const texts: string[] = [];
  for (const rawItem of output) {
    const item = objectRecord(rawItem);
    if (item?.["type"] !== "message" || !Array.isArray(item["content"])) continue;
    for (const rawContent of item["content"]) {
      const content = objectRecord(rawContent);
      if (content?.["type"] === "output_text" && typeof content["text"] === "string") texts.push(content["text"]);
    }
  }
  return texts.length === 1 ? texts[0] ?? null : null;
}

export class OpenAISupportProvider implements SupportProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetcher: FetchLike = fetch,
  ) {
    if (!apiKey.trim()) throw new Error("OpenAI support provider requires an API key.");
    if (!model.trim()) throw new Error("OpenAI support provider requires a model.");
  }

  async respond(input: Parameters<SupportProvider["respond"]>[0]): Promise<string> {
    const response = await this.fetcher(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        store: false,
        instructions,
        input: JSON.stringify({ intent: input.intent, message: input.message, context: input.context }),
        max_output_tokens: 600,
        tools: [],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI support request failed with HTTP ${response.status}.`);
    }

    const text = responseOutputText(await response.json());
    if (!text || !text.trim() || text.length > MAX_REPLY_LENGTH) {
      throw new Error("OpenAI support response did not contain a valid concise text reply.");
    }
    return text.trim();
  }
}

class UnavailableSupportProvider implements SupportProvider {
  async respond(): Promise<string> {
    throw new Error("OpenAI support provider is not configured.");
  }
}

export function configuredOpenAISupportProvider(
  environment: Readonly<Record<string, string | undefined>> = process.env,
  fetcher: FetchLike = fetch,
): SupportProvider {
  const apiKey = environment["OPENAI_API_KEY"]?.trim();
  const model = environment["OPENAI_MODEL"]?.trim();
  if (!apiKey || !model) return new UnavailableSupportProvider();
  return new OpenAISupportProvider(apiKey, model, fetcher);
}
