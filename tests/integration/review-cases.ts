import { afterEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { ids } from "../../prisma/seed-data";
import { ReviewService } from "../../src/modules/participation/reviews/service";

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
}
