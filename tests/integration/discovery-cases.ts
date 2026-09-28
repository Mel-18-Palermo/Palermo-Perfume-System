import { beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { ids } from "../../prisma/seed-data";
import { DiscoveryService } from "../../src/modules/discovery/service";
import type { ApiResult } from "../../src/contracts/common";
import { approvedCatalogueManifest } from "../../prisma/catalogue-data";
import { populateApprovedCatalogueAndQuiz } from "../../prisma/catalogue-population";
import { populateApprovedQuiz } from "../../prisma/quiz-population";
import { approvedQuizManifest } from "../../prisma/quiz-data";
function code<T>(result: ApiResult<T>): string { expect(result.ok).toBe(false); return result.ok ? "" : result.error.code; }
function defaultOptionId(question: typeof approvedQuizManifest.questions[number]): string {
  const option = question.options[0];
  if (!option) throw new Error(`Canonical quiz question ${question.id} requires an option.`);
  return option.id;
}
export function discoveryCases(db: PrismaClient): void {
  describe("deterministic discovery and quiz authority", () => {
    const service = new DiscoveryService(db, () => new Date("2026-09-08T00:00:00.000Z"));
    const familyQuestion = approvedQuizManifest.questions[0];
    if (!familyQuestion) throw new Error("Canonical quiz requires a family question.");
    const request = (familyOptionId: string) => ({
      quizId: approvedQuizManifest.id,
      quizVersion: approvedQuizManifest.version,
      answers: approvedQuizManifest.questions.filter(question => question.required).map(question => ({
        questionId: question.id,
        optionIds: [question.id === familyQuestion.id ? familyOptionId : defaultOptionId(question)],
      })),
    });

    beforeAll(async () => { await populateApprovedCatalogueAndQuiz(db, approvedCatalogueManifest, approvedQuizManifest); });

    it("returns only the active canonical quiz and deactivates the synthetic fixture", async () => {
      const result = await service.getQuiz();
      expect(result).toEqual({ ok: true, data: {
        id: approvedQuizManifest.id,
        version: approvedQuizManifest.version,
        questions: approvedQuizManifest.questions.map(question => ({
          id: question.id,
          prompt: question.prompt,
          required: question.required,
          minSelections: question.minSelections,
          maxSelections: question.maxSelections,
          options: question.options.map(option => ({ id: option.id, label: option.label })),
        })),
      } });
      expect(await db.quiz.findUnique({ where: { id: ids.quiz }, select: { active: true } })).toEqual({ active: false });
      for (const question of approvedQuizManifest.questions) {
        expect(await db.quizOption.findMany({ where: { questionId: question.id }, orderBy: { sortOrder: "asc" }, select: { label: true, value: true } }))
          .toEqual(question.options.map(option => ({ label: option.label, value: option.value })));
      }
    });

    it("reconciles the canonical quiz idempotently and leaves no other quiz active", async () => {
      const before = {
        quizzes: await db.quiz.count(),
        questions: await db.quizQuestion.count({ where: { quizId: approvedQuizManifest.id } }),
        options: await db.quizOption.count({ where: { question: { quizId: approvedQuizManifest.id } } }),
      };
      await populateApprovedQuiz(db, approvedQuizManifest, approvedCatalogueManifest);
      await populateApprovedQuiz(db, approvedQuizManifest, approvedCatalogueManifest);
      expect({
        quizzes: await db.quiz.count(),
        questions: await db.quizQuestion.count({ where: { quizId: approvedQuizManifest.id } }),
        options: await db.quizOption.count({ where: { question: { quizId: approvedQuizManifest.id } } }),
      }).toEqual(before);
      expect(await db.quiz.findMany({ where: { active: true }, select: { id: true, version: true } }))
        .toEqual([{ id: approvedQuizManifest.id, version: approvedQuizManifest.version }]);
    });

    it("rejects missing, duplicate and foreign canonical quiz answers", async () => {
      const option = familyQuestion.options[0];
      if (!option) throw new Error("Canonical quiz requires an option.");
      expect(code(await service.generate({ ...request(option.id), answers: [] }))).toBe("VALIDATION_ERROR");
      expect(code(await service.generate({ ...request(option.id), answers: request(option.id).answers.map(answer =>
        answer.questionId === familyQuestion.id ? { ...answer, optionIds: [option.id, option.id] } : answer,
      ) }))).toBe("VALIDATION_ERROR");
      expect(code(await service.generate({ ...request(option.id), answers: request(option.id).answers.map(answer =>
        answer.questionId === familyQuestion.id ? { ...answer, optionIds: ["24200000-0000-4000-8000-000000000999"] } : answer,
      ) }))).toBe("VALIDATION_ERROR");
    });

    it("maps every exposed option to a real canonical family and recommendation candidates", async () => {
      const approvedProductIds = new Set(approvedCatalogueManifest.products.map(product => product.id));
      for (const option of familyQuestion.options) {
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
      const option = familyQuestion.options[0];
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
      const familyOption = familyQuestion.options[0];
      if (!familyOption) throw new Error("Canonical quiz requires a family option.");
      const providerRequest = request(familyOption.id);
      const result = await service.persistProviderRecommendations(
        providerRequest,
        [
          {
            perfumeId: approvedCatalogueManifest.products.find(product => product.primaryFamilyId === familyOption.value)?.id ?? "",
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
        expect(item?.perfumeId).toBe(approvedCatalogueManifest.products.find(product => product.primaryFamilyId === familyOption.value)?.id);
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
        expect(run.quizAttempt?.responses).toHaveLength(providerRequest.answers.flatMap(answer => answer.optionIds).length);
        expect(run.quizAttempt?.responses.map(response => ({ questionId: response.questionId, optionId: response.optionId }))).toEqual(expect.arrayContaining(
          providerRequest.answers.flatMap(answer => answer.optionIds.map(optionId => ({ questionId: answer.questionId, optionId }))),
        ));
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
