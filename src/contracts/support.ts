import type { Endpoint, EntityId } from "./common";

export type SupportIntent =
  | "PRODUCT"
  | "POLICY"
  | "ORDER"
  | "DELIVERY"
  | "FEEDBACK";

export type SupportHistoryMessage = Readonly<{
  actor: "CUSTOMER" | "ASSISTANT";
  content: string;
}>;

export type SupportRequest = Readonly<{
  intent: SupportIntent;
  message: string;
  orderId?: EntityId;
  /** Recent in-memory turns are untrusted reference material, never Palermo facts. */
  history?: readonly SupportHistoryMessage[];
}>;

export type SupportReply = Readonly<{
  conversationId: EntityId;
  reply: string;
}>;

export type SupportFeedback = Readonly<{
  conversationId: EntityId;
  rating: number;
  comment?: string;
}>;

export type SupportApi = Readonly<{
  ask: Endpoint<SupportRequest, SupportReply>;
  feedback: Endpoint<SupportFeedback, null>;
}>;
