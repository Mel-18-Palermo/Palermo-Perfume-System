import { describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { ids } from "../../prisma/seed-data";
import { DiscoveryService } from "../../src/modules/discovery/service";
import type { ApiResult } from "../../src/contracts/common";
function code<T>(result: ApiResult<T>): string { expect(result.ok).toBe(false); return result.ok ? "" : result.error.code; }
export function discoveryCases(db: PrismaClient): void {
  describe("deterministic discovery and quiz authority", () => {
    const service = new DiscoveryService(db, () => new Date("2026-09-08T00:00:00.000Z"));
    it("returns the approved ordered quiz definition", async () => { const result = await service.getQuiz(); expect(result.ok).toBe(true); if (result.ok) { expect(result.data.id).toBe(ids.quiz); expect(result.data.questions[0]?.options[0]?.id).toBe(ids.option); } });
    it("rejects missing, duplicate and foreign quiz answers", async () => { expect(code(await service.generate({ quizId: ids.quiz, quizVersion: "1", answers: [] }))).toBe("VALIDATION_ERROR"); expect(code(await service.generate({ quizId: ids.quiz, quizVersion: "1", answers: [{ questionId: ids.question, optionIds: [ids.option, ids.option] }] }))).toBe("VALIDATION_ERROR"); expect(code(await service.generate({ quizId: ids.quiz, quizVersion: "1", answers: [{ questionId: ids.question, optionIds: [ids.option, "24200000-0000-4000-8000-000000000999"] }] }))).toBe("VALIDATION_ERROR"); });
    it("persists a deterministic fallback run with canonical catalogue candidates", async () => { const result = await service.generate({ quizId: ids.quiz, quizVersion: "1", answers: [{ questionId: ids.question, optionIds: [ids.option] }] }); expect(result.ok).toBe(true); if (result.ok) { expect(result.data.fallback).toBe(true); expect(result.data.items[0]?.perfumeId).toBe(ids.perfume); expect(result.data.items[0]?.reason).toContain("Deterministic"); expect(await db.recommendationRun.count({ where: { id: result.data.runId, status: "FALLBACK" } })).toBe(1); await db.recommendationItem.deleteMany({ where: { runId: result.data.runId } }); await db.recommendationRun.delete({ where: { id: result.data.runId } }); const attempt = await db.quizAttempt.findFirst({ where: { visitorSessionKey: { startsWith: "quiz-" }, quizId: ids.quiz }, orderBy: { completedAt: "desc" } }); if (attempt) { await db.quizResponse.deleteMany({ where: { attemptId: attempt.id } }); await db.quizAttempt.delete({ where: { id_quizId: { id: attempt.id, quizId: ids.quiz } } }); } } });
  });
}
