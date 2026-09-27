import type { SupportIntent } from "@/contracts/support";

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
