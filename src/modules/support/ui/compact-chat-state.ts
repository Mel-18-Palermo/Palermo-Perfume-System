import type { SupportIntent } from "@/contracts/support";
import type { SupportHistoryMessage } from "@/contracts/support";

const HISTORY_LIMIT = 6;
const HISTORY_MESSAGE_LIMIT = 1_000;

export type CompactChatMessage = Readonly<{
  id: string;
  actor: "CUSTOMER" | "ASSISTANT";
  content: string;
  intent: SupportIntent;
  orderId?: string;
  conversationId?: string;
  state?: "pending" | "error";
  feedback?: "idle" | "sending" | "sent" | "error";
}>;

type TurnInput = Readonly<{
  requestId: string;
  question: string;
  intent: SupportIntent;
  orderId?: string;
}>;

export function appendPendingTurn(
  messages: readonly CompactChatMessage[],
  input: TurnInput,
): readonly CompactChatMessage[] {
  return [...messages,
    { id: `${input.requestId}-customer`, actor: "CUSTOMER", content: input.question, intent: input.intent, ...(input.orderId ? { orderId: input.orderId } : {}) },
    { id: input.requestId, actor: "ASSISTANT", content: "", intent: input.intent, ...(input.orderId ? { orderId: input.orderId } : {}), state: "pending", feedback: "idle" },
  ];
}

export function markRetryPending(messages: readonly CompactChatMessage[], requestId: string): readonly CompactChatMessage[] {
  return messages.map(message => message.id === requestId ? { ...message, state: "pending", content: "" } : message);
}

export function completeTurn(messages: readonly CompactChatMessage[], requestId: string, conversationId: string, reply: string): readonly CompactChatMessage[] {
  return messages.map(message => {
    if (message.id !== requestId) return message;
    return {
      id: message.id,
      actor: message.actor,
      content: reply,
      intent: message.intent,
      ...(message.orderId ? { orderId: message.orderId } : {}),
      conversationId,
      feedback: "idle",
    };
  });
}

export function failTurn(messages: readonly CompactChatMessage[], requestId: string, error: string): readonly CompactChatMessage[] {
  return messages.map(message => message.id === requestId ? { ...message, content: error, state: "error" } : message);
}

/** Current-session transcript only; failed and pending turns cannot guide the provider. */
export function recentSupportHistory(messages: readonly CompactChatMessage[]): readonly SupportHistoryMessage[] {
  return messages.filter((message, index) => !message.state && message.content.trim()
    && (message.actor === "ASSISTANT" || (messages[index + 1]?.actor === "ASSISTANT" && !messages[index + 1]?.state)))
    .slice(-HISTORY_LIMIT)
    .map(message => ({ actor: message.actor, content: message.content.trim().slice(0, HISTORY_MESSAGE_LIMIT) }));
}

export function retryRequest(messages: readonly CompactChatMessage[], requestId: string): Readonly<{ question: string; intent: SupportIntent; orderId?: string; history: readonly SupportHistoryMessage[] }> | null {
  const failedIndex = messages.findIndex(message => message.id === requestId && message.actor === "ASSISTANT" && message.state === "error");
  const customer = failedIndex > 0 ? messages[failedIndex - 1] : undefined;
  if (!customer || customer.actor !== "CUSTOMER") return null;
  return {
    question: customer.content,
    intent: customer.intent,
    ...(customer.orderId ? { orderId: customer.orderId } : {}),
    history: recentSupportHistory(messages),
  };
}
