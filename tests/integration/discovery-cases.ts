import { beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { ids } from "../../prisma/seed-data";
import { DiscoveryService } from "../../src/modules/discovery/service";
import type { ApiResult } from "../../src/contracts/common";
import { approvedCatalogueManifest } from "../../prisma/catalogue-data";
import { populateApprovedCatalogueAndQuiz } from "../../prisma/catalogue-population";
import { approvedQuizManifest } from "../../prisma/quiz-data";
function code<T>(result: ApiResult<T>): string { expect(result.ok).toBe(false); return result.ok ? "" : result.error.code; }
export function discoveryCases(db: PrismaClient): void {
  describe("deterministic discovery and quiz authority", () => {
    const service = new DiscoveryService(db, () => new Date("2026-09-08T00:00:00.000Z"));
    const question = approvedQuizManifest.questions[0];
    if (!question) throw new Error("Canonical quiz requires a family question.");
    const request = (optionId: string) => ({
      quizId: approvedQuizManifest.id,
      quizVersion: approvedQuizManifest.version,
      answers: [{ questionId: question.id, optionIds: [optionId] }],
    });

    beforeAll(async () => { await populateApprovedCatalogueAndQuiz(db, approvedCatalogueManifest, approvedQuizManifest); });

    it("returns only the active canonical family quiz and deactivates the synthetic fixture", async () => {
      const result = await service.getQuiz();
      expect(result).toMatchObject({ ok: true, data: {
        id: approvedQuizManifest.id, version: "2", questions: [{
          id: question.id, prompt: "Which fragrance family would you like to explore?",
          required: true, minSelections: 1, maxSelections: 1,
          options: [
            { id: question.options[0]?.id, label: "Amber" },
            { id: question.options[1]?.id, label: "Fruity" },
            { id: question.options[2]?.id, label: "Vanilla" },
            { id: question.options[3]?.id, label: "Warm Spicy" },
          ],
        }],
      } });
      expect(await db.quiz.findUnique({ where: { id: ids.quiz }, select: { active: true } })).toEqual({ active: false });
      expect(await db.quizOption.findMany({ where: { questionId: question.id }, orderBy: { sortOrder: "asc" }, select: { label: true, value: true } }))
        .toEqual(question.options.map(option => ({ label: option.label, value: option.value })));
    });

    it("reconciles the canonical quiz idempotently and leaves no other quiz active", async () => {
      const before = {
        quizzes: await db.quiz.count(),
        questions: await db.quizQuestion.count({ where: { quizId: approvedQuizManifest.id } }),
        options: await db.quizOption.count({ where: { questionId: question.id } }),
      };
      await populateApprovedCatalogueAndQuiz(db, approvedCatalogueManifest, approvedQuizManifest);
      await populateApprovedCatalogueAndQuiz(db, approvedCatalogueManifest, approvedQuizManifest);
      expect({
        quizzes: await db.quiz.count(),
        questions: await db.quizQuestion.count({ where: { quizId: approvedQuizManifest.id } }),
        options: await db.quizOption.count({ where: { questionId: question.id } }),
      }).toEqual(before);
      expect(await db.quiz.findMany({ where: { active: true }, select: { id: true, version: true } }))
        .toEqual([{ id: approvedQuizManifest.id, version: approvedQuizManifest.version }]);
    });

    it("rejects missing, duplicate and foreign canonical quiz answers", async () => {
      const option = question.options[0];
      if (!option) throw new Error("Canonical quiz requires an option.");
      expect(code(await service.generate({ ...request(option.id), answers: [] }))).toBe("VALIDATION_ERROR");
      expect(code(await service.generate({ ...request(option.id), answers: [{ questionId: question.id, optionIds: [option.id, option.id] }] }))).toBe("VALIDATION_ERROR");
      expect(code(await service.generate({ ...request(option.id), answers: [{ questionId: question.id, optionIds: ["24200000-0000-4000-8000-000000000999"] }] }))).toBe("VALIDATION_ERROR");
    });

    it("maps every exposed option to a real canonical family and recommendation candidates", async () => {
      const approvedProductIds = new Set(approvedCatalogueManifest.products.map(product => product.id));
      for (const option of question.options) {
        const context = await service.getCandidateContext(request(option.id));
        expect(context).toMatchObject({ ok: true, data: { selectedFamilies: [{ id: option.value, label: option.label }] } });
        if (!context.ok) continue;
        expect(context.data.candidates.length).toBeGreaterThan(0);
        expect(context.data.candidates.every(candidate => approvedProductIds.has(candidate.perfume.id))).toBe(true);
        expect(context.data.candidates.map(candidate => candidate.perfume.id)).not.toContain(ids.perfume);
        expect(context.data.candidates.map(candidate => candidate.perfume.id)).not.toContain(ids.woodyPerfume);
      }
    });

    it("persists deterministic canonical-family recommendations", async () => {
      const option = question.options[0];
      if (!option) throw new Error("Canonical quiz requires an option.");
      const result = await service.generate(request(option.id));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      try {
        expect(result.data.fallback).toBe(true);
        expect(result.data.items.length).toBeGreaterThan(0);
        expect(result.data.items.map(item => item.perfumeId)).not.toContain(ids.perfume);
        expect(result.data.items.map(item => item.perfumeId)).not.toContain(ids.woodyPerfume);
        expect(await db.recommendationRun.count({ where: { id: result.data.runId, status: "FALLBACK" } })).toBe(1);
      } finally {
        const run = await db.recommendationRun.findUniqueOrThrow({ where: { id: result.data.runId } });
        await db.recommendationItem.deleteMany({ where: { runId: result.data.runId } });
        await db.recommendationRun.delete({ where: { id: result.data.runId } });
        if (run.quizAttemptId) {
          await db.quizResponse.deleteMany({ where: { attemptId: run.quizAttemptId } });
          await db.quizAttempt.delete({ where: { id_quizId: { id: run.quizAttemptId, quizId: approvedQuizManifest.id } } });
        }
      }
    });

    it("persists a provider recommendation as a succeeded run with canonical catalogue data", async () => {
      const result = await service.persistProviderRecommendations(
        {
          quizId: approvedQuizManifest.id,
          quizVersion: approvedQuizManifest.version,
          answers: [
            {
              questionId: question.id,
              optionIds: [question.options[0]?.id ?? ""],
            },
          ],
        },
        [
          {
            perfumeId: approvedCatalogueManifest.products.find(product => product.primaryFamilyId === question.options[0]?.value)?.id ?? "",
            reason: "Grounded provider recommendation.",
          },
        ],
        "resp_test_persisted",
      );

      expect(result.ok).toBe(true);

      if (!result.ok) {
        return;
      }

      try {
        expect(result.data.fallback).toBe(false);
        expect(result.data.items).toHaveLength(1);

        const item = result.data.items[0];
        expect(item?.perfumeId).toBe(approvedCatalogueManifest.products.find(product => product.primaryFamilyId === question.options[0]?.value)?.id);
        expect(item?.perfume.id).toBe(item?.perfumeId);
        expect(item?.perfume.name).toBe("Saphire Chocolate");
        expect(item?.perfume.priceFrom).toEqual({
          amountMinor: 3500,
          currency: "AUD",
        });
        expect(item?.reason).toBe(
          "Grounded provider recommendation.",
        );

        const run = await db.recommendationRun.findUniqueOrThrow({
          where: { id: result.data.runId },
          include: {
            items: true,
            quizAttempt: {
              include: {
                responses: true,
              },
            },
          },
        });

        expect(run.status).toBe("SUCCEEDED");
        expect(run.providerReference).toBe("resp_test_persisted");
        expect(run.items).toEqual([
          expect.objectContaining({
            perfumeId: item?.perfumeId,
            rank: 1,
            explanation: "Grounded provider recommendation.",
          }),
        ]);
        expect(run.quizAttempt?.status).toBe("COMPLETED");
        expect(run.quizAttempt?.responses).toEqual([
          expect.objectContaining({
            questionId: question.id,
            optionId: question.options[0]?.id,
          }),
        ]);
      } finally {
        const run = await db.recommendationRun.findUnique({
          where: { id: result.data.runId },
        });

        await db.recommendationItem.deleteMany({
          where: { runId: result.data.runId },
        });

        await db.recommendationRun.deleteMany({
          where: { id: result.data.runId },
        });

        if (run?.quizAttemptId) {
          await db.quizResponse.deleteMany({
            where: { attemptId: run.quizAttemptId },
          });

          await db.quizAttempt.deleteMany({
            where: { id: run.quizAttemptId },
          });
        }
      }
    });
  });
}
