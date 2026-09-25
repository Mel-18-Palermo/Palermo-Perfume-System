import { describe, expect, it } from "vitest";
import { createAdminHttpClient } from "../../src/lib/admin/client";
import { createParticipationHttpClient } from "../../src/lib/participation/client";
import { createReviewsHttpClient } from "../../src/lib/reviews/client";
import { createSupportHttpClient } from "../../src/lib/support/client";

type RecordedCall = Readonly<{ url: string; init?: RequestInit }>;

function recordingFetcher(calls: RecordedCall[]): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), ...(init ? { init } : {}) });
    return new Response(JSON.stringify({ ok: true, data: null }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

describe("final service HTTP clients", () => {
  it("uses the canonical public and customer participation routes", async () => {
    const calls: RecordedCall[] = [];
    const fetcher = recordingFetcher(calls);

    await createSupportHttpClient(fetcher).ask({
      intent: "POLICY",
      message: "What is the returns policy?",
    });
    await createReviewsHttpClient(fetcher).publicForPerfume({
      perfumeId: "27500000-0000-4000-8000-000000000001",
    });
    await createParticipationHttpClient(fetcher).referralCode();

    expect(calls.map(call => [call.url, call.init?.method])).toEqual([
      ["/api/support/ask", "POST"],
      ["/api/reviews/public?perfumeId=27500000-0000-4000-8000-000000000001", "GET"],
      ["/api/participation/referral-code", "POST"],
    ]);
    expect(calls[0]?.init?.credentials).toBe("same-origin");
  });

  it("keeps moderation and promotion mutations on administrator routes", async () => {
    const calls: RecordedCall[] = [];
    const admin = createAdminHttpClient(recordingFetcher(calls));

    await admin.moderateReview({
      reviewId: "27500000-0000-4000-8000-000000000002",
      status: "APPROVED",
    });
    await admin.createPromotion({
      code: "SPRING25",
      discountType: "PERCENTAGE",
      discountValue: 2_500,
      active: true,
    });
    await admin.createPromotionalContent({
      title: "Spring launch",
      brief: "A short launch preview.",
    });
    await admin.generatePromotionalContent({
      contentId: "27700000-0000-4000-8000-000000000003",
    });
    await admin.reviewPromotionalContent({
      contentId: "27700000-0000-4000-8000-000000000003",
      status: "REJECTED",
    });

    expect(calls.map(call => call.url)).toEqual([
      "/api/admin/reviews/moderate",
      "/api/admin/promotions/create-promotion",
      "/api/admin/promotions/create-content",
      "/api/admin/promotions/generate-content",
      "/api/admin/promotions/review-content",
    ]);
    expect(calls.every(call => call.init?.method === "POST")).toBe(true);
  });

  it("returns safe failures for malformed or unavailable transports", async () => {
    const malformed = (async () => new Response(JSON.stringify({ unexpected: true }))) as typeof fetch;
    const unavailable = (async () => { throw new Error("network detail"); }) as typeof fetch;

    await expect(createSupportHttpClient(malformed).ask({ intent: "PRODUCT", message: "Help" }))
      .resolves.toMatchObject({ ok: false, error: { code: "INTEGRATION_ERROR" } });
    await expect(createReviewsHttpClient(unavailable).publicForPerfume({ perfumeId: "perfume" }))
      .resolves.toMatchObject({ ok: false, error: { code: "TEMPORARILY_UNAVAILABLE" } });
  });
});
