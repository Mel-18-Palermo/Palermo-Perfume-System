import { afterEach, describe, expect, it, vi } from "vitest";
import { ids } from "../../prisma/seed-data";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { PromotionalContentService, type PromotionalVideoProvider } from "../../src/modules/promotions/content/service";

const manager = { adminId: ids.admin, permissions: ["promotions:manage"] } as const;
const unprivileged = { adminId: ids.admin, permissions: [] } as const;
const promotionInput = (code: string) => ({ code, discountType: "PERCENTAGE" as const, discountValue: 2_500, active: true });
const workingProvider: PromotionalVideoProvider = { generate: async () => ({ jobId: "provider-job-1", previewUrl: "https://video.example.test/previews/1" }) };

export function promotionalContentCases(db: PrismaClient): void {
  describe("promotion management and promotional content review", () => {
    afterEach(async () => {
      await db.promotionalContent.deleteMany();
      await db.promotion.deleteMany();
    });

    it("enforces promotion management permission and validates discounts, currency, and date windows", async () => {
      const service = new PromotionalContentService(db, workingProvider);
      expect(await service.createPromotion(unprivileged, promotionInput("PROMO-277"))).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      expect(await service.createPromotion(manager, { ...promotionInput("PROMO-278"), discountValue: 10_001 })).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
      expect(await service.createPromotion(manager, { ...promotionInput("PROMO-279"), discountType: "FIXED", currency: "aud", discountValue: 500 })).toMatchObject({ ok: true });
      expect(await service.createPromotion(manager, { ...promotionInput("PROMO-280"), discountType: "FIXED", currency: "AUD", discountValue: -1 })).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
      expect(await service.createPromotion(manager, { ...promotionInput("PROMO-281"), activeFrom: new Date("2026-10-02T00:00:00Z"), activeUntil: new Date("2026-10-01T00:00:00Z") })).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    });

    it("creates draft content, generates an unreviewed preview, then records approval reviewer metadata", async () => {
      const service = new PromotionalContentService(db, workingProvider, () => new Date("2026-09-24T12:00:00Z"));
      const created = await service.create(manager, { title: "Spring launch", brief: "A short video for the spring launch." });
      if (!created.ok) throw new Error("promotional content creation failed");
      expect(await db.promotionalContent.findUniqueOrThrow({ where: { id: created.data.id } })).toMatchObject({ status: "DRAFT", reviewedById: null, reviewedAt: null });
      expect(await service.generate(manager, created.data.id)).toMatchObject({ ok: true });
      expect(await db.promotionalContent.findUniqueOrThrow({ where: { id: created.data.id } })).toMatchObject({ status: "PREVIEW", provider: "AI_VIDEO", providerJobId: "provider-job-1", reviewedById: null, reviewedAt: null });
      expect(await service.review(manager, created.data.id, "APPROVED")).toMatchObject({ ok: true });
      expect(await db.promotionalContent.findUniqueOrThrow({ where: { id: created.data.id } })).toMatchObject({ status: "APPROVED", reviewedById: ids.admin, reviewedAt: new Date("2026-09-24T12:00:00Z") });
    });

    it("records rejection only after a preview and denies unauthorised content management", async () => {
      const service = new PromotionalContentService(db, workingProvider);
      expect(await service.create(unprivileged, { title: "Denied", brief: "Denied." })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      const created = await service.create(manager, { title: "Review me", brief: "A video needing review." });
      if (!created.ok) throw new Error("promotional content creation failed");
      expect(await service.review(unprivileged, created.data.id, "REJECTED")).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      expect(await service.review(manager, created.data.id, "REJECTED")).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
      expect(await service.generate(manager, created.data.id)).toMatchObject({ ok: true });
      expect(await service.review(manager, created.data.id, "REJECTED")).toMatchObject({ ok: true });
      expect(await db.promotionalContent.findUniqueOrThrow({ where: { id: created.data.id } })).toMatchObject({ status: "REJECTED", reviewedById: ids.admin });
    });

    it("fails safely on provider failures without fabricating review metadata", async () => {
      const service = new PromotionalContentService(db, { generate: async () => { throw new Error("provider unavailable"); } });
      const created = await service.create(manager, { title: "Failure test", brief: "Provider error path." });
      if (!created.ok) throw new Error("promotional content creation failed");
      expect(await service.generate(manager, created.data.id)).toMatchObject({ ok: false, error: { code: "TEMPORARILY_UNAVAILABLE" } });
      expect(await db.promotionalContent.findUniqueOrThrow({ where: { id: created.data.id } })).toMatchObject({ status: "FAILED", failureCode: "PROVIDER_UNAVAILABLE", reviewedById: null, reviewedAt: null });
    });

    it("fails safely when the provider returns malformed output", async () => {
      const service = new PromotionalContentService(db, { generate: async () => ({ jobId: "only-a-job" }) });
      const created = await service.create(manager, { title: "Malformed test", brief: "Malformed provider output." });
      if (!created.ok) throw new Error("promotional content creation failed");
      expect(await service.generate(manager, created.data.id)).toMatchObject({ ok: false, error: { code: "TEMPORARILY_UNAVAILABLE" } });
      expect(await db.promotionalContent.findUniqueOrThrow({ where: { id: created.data.id } })).toMatchObject({ status: "FAILED", previewUrl: null, reviewedById: null, reviewedAt: null });
    });

    it("atomically claims duplicate generation so the provider is invoked once", async () => {
      let calls = 0;
      let resolveProvider!: (value: unknown) => void;
      const provider: PromotionalVideoProvider = {
        generate: async () => {
          calls += 1;
          return new Promise((resolve) => { resolveProvider = resolve; });
        },
      };
      const service = new PromotionalContentService(db, provider);
      const created = await service.create(manager, { title: "Concurrent test", brief: "Only one generation should be claimed." });
      if (!created.ok) throw new Error("promotional content creation failed");

      const first = service.generate(manager, created.data.id);
      await vi.waitFor(() => expect(calls).toBe(1));
      expect(await service.generate(manager, created.data.id)).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
      resolveProvider({ jobId: "provider-job-concurrent", previewUrl: "https://video.example.test/previews/concurrent" });

      expect(await first).toMatchObject({ ok: true });
      expect(calls).toBe(1);
      expect(await db.promotionalContent.findUniqueOrThrow({ where: { id: created.data.id } })).toMatchObject({ status: "PREVIEW", reviewedById: null, reviewedAt: null });
    });
  });
}
