import { describe, expect, it } from "vitest";
import { appendPendingTurn, completeTurn, failTurn, markRetryPending, productLinkFollowUpIds, recentSupportHistory, retryRequest } from "../../src/modules/support/ui/compact-chat-state";

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
    const products = [{ id: "product-1", slug: "palermo-gold", name: "Palermo Gold", href: "/product/product-1", priceLabel: "AUD $35.00" }];
    expect(completeTurn(pending, "request-1", "conversation-1", "Your authorised order is shipped.", products)).toEqual([
      pending[0],
      { id: "request-1", actor: "ASSISTANT", content: "Your authorised order is shipped.", intent: "ORDER", orderId: "owned-order", conversationId: "conversation-1", products, feedback: "idle" },
    ]);
  });

  it("keeps the customer turn visible and makes a failed assistant reply retryable", () => {
    const pending = appendPendingTurn([], { requestId: "request-1", question: "Help", intent: "PRODUCT" });
    const failed = failTurn(pending, "request-1", "The support service is temporarily unavailable.");
    expect(failed[0]).toEqual(pending[0]);
    expect(failed[1]).toMatchObject({ state: "error", content: "The support service is temporarily unavailable." });
    expect(markRetryPending(failed, "request-1")[1]).toMatchObject({ state: "pending", content: "" });
  });

  it("keeps only bounded completed current-session turns for reference resolution", () => {
    const completed = completeTurn(appendPendingTurn([], { requestId: "request-1", question: "Tell me about Palermo vanilla.", intent: "PRODUCT" }), "request-1", "conversation-1", "Palermo has a vanilla fragrance.");
    const failed = failTurn(appendPendingTurn(completed, { requestId: "request-2", question: "Unrelated question", intent: "PRODUCT" }), "request-2", "Unavailable");

    expect(recentSupportHistory(failed)).toEqual([
      { actor: "CUSTOMER", content: "Tell me about Palermo vanilla." },
      { actor: "ASSISTANT", content: "Palermo has a vanilla fragrance." },
    ]);
  });

  it("returns at most six completed messages as history", () => {
    const transcript = Array.from({ length: 8 }, (_, index) => ({
      id: `message-${index}`,
      actor: index % 2 === 0 ? "CUSTOMER" as const : "ASSISTANT" as const,
      content: `Message ${index}`,
      intent: "PRODUCT" as const,
    }));

    expect(recentSupportHistory(transcript)).toEqual([
      { actor: "CUSTOMER", content: "Message 2" },
      { actor: "ASSISTANT", content: "Message 3" },
      { actor: "CUSTOMER", content: "Message 4" },
      { actor: "ASSISTANT", content: "Message 5" },
      { actor: "CUSTOMER", content: "Message 6" },
      { actor: "ASSISTANT", content: "Message 7" },
    ]);
  });

  it("retries the associated customer question rather than the failed error message", () => {
    const failed = failTurn(appendPendingTurn([], {
      requestId: "request-1",
      question: "Which fragrances contain vanilla?",
      intent: "PRODUCT",
      orderId: "owned-order",
    }), "request-1", "The support service is temporarily unavailable.");

    expect(retryRequest(failed, "request-1")).toEqual({
      question: "Which fragrances contain vanilla?",
      intent: "PRODUCT",
      orderId: "owned-order",
      history: [],
    });
  });

  it("forwards only the immediately preceding server-issued products for a link follow-up", () => {
    const transcript = completeTurn(appendPendingTurn([], { requestId: "request-1", question: "I like fruity", intent: "PRODUCT" }), "request-1", "conversation-1", "**Candy** could suit you.", [{ id: "product-candy", slug: "candy", name: "Candy", href: "/product/product-candy", priceLabel: "AUD $35.00" }]);
    expect(productLinkFollowUpIds(transcript, "can I get the link?")).toEqual(["product-candy"]);
    expect(productLinkFollowUpIds(transcript, "tell me more")).toEqual([]);
  });
});
