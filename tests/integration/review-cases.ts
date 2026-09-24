import { afterEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { ids } from "../../prisma/seed-data";
import { ReviewService } from "../../src/modules/participation/reviews/service";
import { ParticipationService } from "../../src/modules/participation/loyalty/service";
import { PromotionalContentService } from "../../src/modules/promotions/content/service";
import { SupportService } from "../../src/modules/support/service";

export function reviewCases(db: PrismaClient): void {
  describe("verified-purchase reviews and moderation", () => {
    const service = new ReviewService(db, () => new Date("2026-09-24T00:00:00Z"));
    afterEach(async () => { await db.review.deleteMany(); });
    it("accepts a purchaser once, rejects a non-purchaser and duplicate", async () => {
      expect((await service.create({ customerId: ids.customer }, { perfumeId: ids.perfume, rating: 5, text: "Excellent synthetic review" })).ok).toBe(true);
      expect((await service.create({ customerId: ids.otherCustomer }, { perfumeId: ids.perfume, rating: 5, text: "Not purchased" }))).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      expect((await service.create({ customerId: ids.customer }, { perfumeId: ids.perfume, rating: 4, text: "Duplicate synthetic review" }))).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    });
    it("keeps pending reviews private and requires authorised moderation", async () => {
      const created = await service.create({ customerId: ids.customer }, { perfumeId: ids.perfume, rating: 5, text: "Moderation test review" });
      if (!created.ok) throw new Error("review creation failed");
      const pendingPublic = await service.publicForPerfume(ids.perfume);
      expect(pendingPublic.ok).toBe(true);
      if (!pendingPublic.ok) throw new Error("public review query failed");
      expect(pendingPublic.data).toEqual([]);
      expect(await service.moderate({ adminId: ids.admin, permissions: [] }, created.data.id, "APPROVED")).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      expect((await service.moderate({ adminId: ids.admin, permissions: ["reviews:moderate"] }, created.data.id, "APPROVED")).ok).toBe(true);
      const publicReviews = await service.publicForPerfume(ids.perfume);
      expect(publicReviews.ok && publicReviews.data).toHaveLength(1);
      expect((await service.moderate({ adminId: ids.admin, permissions: ["reviews:moderate"] }, created.data.id, "HIDDEN")).ok).toBe(true);
      const hiddenPublic = await service.publicForPerfume(ids.perfume);
      expect(hiddenPublic.ok).toBe(true);
      if (!hiddenPublic.ok) throw new Error("public review query failed");
      expect(hiddenPublic.data).toEqual([]);
    });
  });

  describe("participation, promotional content, and bounded support", () => {
    afterEach(async () => {
      await db.supportFeedback.deleteMany(); await db.supportMessage.deleteMany(); await db.supportConversation.deleteMany();
      await db.promotionalContent.deleteMany(); await db.promotion.deleteMany(); await db.loyaltyLedgerEntry.deleteMany(); await db.loyaltyAccount.deleteMany();
      await db.referral.deleteMany(); await db.referralCode.deleteMany(); await db.subscription.deleteMany();
    });
    it("replays qualifying rewards once and stores subscription/referral ownership", async () => {
      const service = new ParticipationService(db, () => "REFERRAL1");
      expect((await service.setSubscription(ids.customer, true)).ok).toBe(true);
      expect((await service.setSubscription(ids.customer, false)).ok).toBe(true);
      const referral = await service.referralCode(ids.customer);
      expect(referral).toMatchObject({ ok: true, data: { code: "REFERRAL1" } });
      expect((await service.applyReferral(ids.otherCustomer, "REFERRAL1")).ok).toBe(true);
      expect(await service.rewardCompletedOrder(ids.customer, ids.paidOrder, 100)).toMatchObject({ ok: true, data: { awarded: true } });
      expect(await service.rewardCompletedOrder(ids.customer, ids.paidOrder, 100)).toMatchObject({ ok: true, data: { awarded: false } });
      expect((await db.loyaltyAccount.findUniqueOrThrow({ where: { customerId: ids.customer } })).points).toBe(100);
    });
    it("enforces preview review and isolates video provider failure", async () => {
      const actor = { adminId: ids.admin, permissions: ["promotions:manage"] };
      const service = new PromotionalContentService(db, { generate: async () => ({ jobId: "synthetic-job", previewUrl: "https://preview.example.test/video" }) });
      const created = await service.create(actor, { title: "Synthetic launch", brief: "Approved synthetic assets only" });
      if (!created.ok) throw new Error("content creation failed");
      expect((await db.promotionalContent.findUniqueOrThrow({ where: { id: created.data.id } })).reviewedById).toBeNull();
      expect((await service.generate(actor, created.data.id)).ok).toBe(true);
      expect((await service.review(actor, created.data.id, "APPROVED")).ok).toBe(true);
      const failing = new PromotionalContentService(db, { generate: async () => { throw new Error("unavailable"); } });
      const next = await failing.create(actor, { title: "Failure", brief: "Synthetic failure" });
      if (!next.ok) throw new Error("content creation failed");
      expect(await failing.generate(actor, next.data.id)).toMatchObject({ ok: false, error: { code: "TEMPORARILY_UNAVAILABLE" } });
    });
    it("validates promotion rules at the admin boundary", async () => {
      const service = new PromotionalContentService(db, { generate: async () => ({ jobId: "unused", previewUrl: "https://example.test" }) });
      const actor = { adminId: ids.admin, permissions: ["promotions:manage"] };
      expect(await service.createPromotion(actor, { code: "BAD", discountType: "FIXED", discountValue: 100, active: true })).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
      expect(await service.createPromotion(actor, { code: "BADPCT", discountType: "PERCENTAGE", discountValue: 10_001, currency: "AUD", active: true })).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
      const created = await service.createPromotion(actor, { code: "WELCOME10", discountType: "PERCENTAGE", discountValue: 1_000, active: true, activeFrom: new Date("2026-09-01"), activeUntil: new Date("2026-10-01") });
      expect(created.ok).toBe(true);
      if (!created.ok) throw new Error("promotion creation failed");
      expect(await service.updatePromotion({ adminId: ids.admin, permissions: [] }, created.data.id, { code: "WELCOME10", discountType: "PERCENTAGE", discountValue: 1_000, active: false })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    });
    it("uses only owned order context and fails closed on malformed provider output", async () => {
      let publicContext: Record<string, unknown> | undefined;
      const service = new SupportService(db, { respond: async ({ context }) => { publicContext = context as Record<string, unknown>; return typeof context.order === "object" ? "Synthetic order response" : "Synthetic public response"; } }, () => new Date("2026-09-24T00:00:00Z"));
      expect((await service.ask({ intent: "PRODUCT", message: "Explain bergamot" })).ok).toBe(true);
      expect(publicContext).toEqual({});
      expect((await service.ask({ customerId: ids.otherCustomer, intent: "ORDER", message: "My order", orderId: ids.paidOrder }))).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      expect(await service.ask({ intent: "ORDER", message: "Refund my order", tool: "refund.execute" })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      const failed = new SupportService(db, { respond: async () => "" });
      expect(await failed.ask({ intent: "POLICY", message: "Return policy" })).toMatchObject({ ok: false, error: { code: "TEMPORARILY_UNAVAILABLE" } });
    });
    it("times out providers and keeps feedback bound to its conversation owner", async () => {
      const timeout = new SupportService(db, { respond: async () => new Promise<string>(() => undefined) }, () => new Date(), 1);
      expect(await timeout.ask({ intent: "PRODUCT", message: "Timeout test" })).toMatchObject({ ok: false, error: { code: "TEMPORARILY_UNAVAILABLE" } });
      const service = new SupportService(db, { respond: async () => "Synthetic response" });
      await service.ask({ customerId: ids.customer, intent: "PRODUCT", message: "Feedback context" });
      const conversation = await db.supportConversation.findFirstOrThrow({ where: { customerId: ids.customer }, orderBy: { createdAt: "desc" } });
      expect(await service.feedback(ids.otherCustomer, conversation.id, 5, "Wrong owner")).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      expect((await service.feedback(ids.customer, conversation.id, 5, "Owned feedback")).ok).toBe(true);
    });
    it("keeps referral qualification metadata and credit replay-consistent", async () => {
      const service = new ParticipationService(db, () => "REFERRAL2");
      await service.referralCode(ids.otherCustomer);
      expect((await service.applyReferral(ids.customer, "REFERRAL2")).ok).toBe(true);
      expect(await service.rewardQualifyingReferral(ids.paidOrder, 100)).toMatchObject({ ok: true, data: { awarded: true } });
      expect(await service.rewardQualifyingReferral(ids.paidOrder, 100)).toMatchObject({ ok: true, data: { awarded: false } });
      const referral = await db.referral.findUniqueOrThrow({ where: { referredCustomerId: ids.customer } });
      expect(referral).toMatchObject({ qualifyingOrderId: ids.paidOrder, qualifiedAt: expect.any(Date) });
      expect(await db.loyaltyLedgerEntry.count({ where: { referralId: referral.id } })).toBe(1);
    });
  });
}
