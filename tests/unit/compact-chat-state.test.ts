import { describe, expect, it } from "vitest";
import { appendPendingTurn, completeTurn, failTurn, markRetryPending } from "../../src/modules/support/ui/compact-chat-state";

describe("compact concierge chat state", () => {
  it("adds distinct customer and pending assistant turns to the current-session transcript", () => {
    const transcript = appendPendingTurn([], { requestId: "request-1", question: "Can you help with a product?", intent: "PRODUCT" });
    expect(transcript).toEqual([
      { id: "request-1-customer", actor: "CUSTOMER", content: "Can you help with a product?", intent: "PRODUCT" },
      { id: "request-1", actor: "ASSISTANT", content: "", intent: "PRODUCT", state: "pending", feedback: "idle" },
    ]);
  });

  it("replaces a pending turn with a successful assistant reply", () => {
    const pending = appendPendingTurn([], { requestId: "request-1", question: "Where is my order?", intent: "ORDER", orderId: "owned-order" });
    expect(completeTurn(pending, "request-1", "conversation-1", "Your authorised order is shipped.")).toEqual([
      pending[0],
      { id: "request-1", actor: "ASSISTANT", content: "Your authorised order is shipped.", intent: "ORDER", orderId: "owned-order", conversationId: "conversation-1", feedback: "idle" },
    ]);
  });

  it("keeps the customer turn visible and makes a failed assistant reply retryable", () => {
    const pending = appendPendingTurn([], { requestId: "request-1", question: "Help", intent: "PRODUCT" });
    const failed = failTurn(pending, "request-1", "The support service is temporarily unavailable.");
    expect(failed[0]).toEqual(pending[0]);
    expect(failed[1]).toMatchObject({ state: "error", content: "The support service is temporarily unavailable." });
    expect(markRetryPending(failed, "request-1")[1]).toMatchObject({ state: "pending", content: "" });
  });
});
