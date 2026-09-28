import { beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import type { RecommendationRequest } from "../../src/contracts/recommendations";
import { ids, seedId } from "../../prisma/seed-data";
import { DiscoveryService } from "../../src/modules/discovery/service";
import { approvedCatalogueManifest, approvedCatalogueFamilyIds } from "../../prisma/catalogue-data";
import { populateApprovedCatalogueAndQuiz } from "../../prisma/catalogue-population";
import { approvedQuizManifest } from "../../prisma/quiz-data";

function defaultOptionId(question: typeof approvedQuizManifest.questions[number]): string {
  const option = question.options[0];
  if (!option) throw new Error(`Canonical quiz question ${question.id} requires an option.`);
  return option.id;
}

const familyQuestion = approvedQuizManifest.questions[0];
const amberOption = familyQuestion?.options[0];
const matchingAmberPerfume = approvedCatalogueManifest.products.find(product => product.primaryFamilyId === approvedCatalogueFamilyIds.amber);
if (!familyQuestion || !amberOption || !matchingAmberPerfume) throw new Error("Canonical quiz fixtures are incomplete.");
const amberPerfume = matchingAmberPerfume;
const canonicalRequest = (familyOptionId = amberOption.id): RecommendationRequest => ({
  quizId: approvedQuizManifest.id, quizVersion: approvedQuizManifest.version,
  answers: approvedQuizManifest.questions.filter(question => question.required).map(question => ({
    questionId: question.id,
    optionIds: [question.id === familyQuestion.id ? familyOptionId : defaultOptionId(question)],
  })),
});
const request = canonicalRequest();

async function removeRun(db: PrismaClient, runId: string): Promise<void> {
  const run = await db.recommendationRun.findUniqueOrThrow({ where: { id: runId } });
  await db.recommendationItem.deleteMany({ where: { runId } });
  await db.recommendationRun.delete({ where: { id: runId } });
  if (run.quizAttemptId) {
    await db.quizResponse.deleteMany({ where: { attemptId: run.quizAttemptId } });
    await db.quizAttempt.delete({ where: { id: run.quizAttemptId } });
  }
}

export function discoveryCompletionCases(db: PrismaClient): void {
  describe("completed deterministic discovery", () => {
    const service = new DiscoveryService(db, () => new Date("2026-09-08T00:00:00.000Z"));

    beforeAll(async () => {
      await populateApprovedCatalogueAndQuiz(db, approvedCatalogueManifest, approvedQuizManifest);
    });

    it("maps controlled mood, occasion and weather tags to active catalogue perfumes", async () => {
      const tags = [
        { id: seedId(9300), category: "MOOD" as const, value: "Synthetic calm" },
        { id: seedId(9301), category: "OCCASION" as const, value: "Synthetic evening" },
        { id: seedId(9302), category: "WEATHER" as const, value: "Synthetic warm" },
      ] as const;
      try {
        for (const tag of tags) {
          await db.suitabilityTag.create({ data: tag });
          await db.perfumeSuitability.create({ data: { perfumeId: ids.perfume, tagId: tag.id } });
        }
        for (const [kind, tag] of [["mood", tags[0]], ["occasion", tags[1]], ["weather", tags[2]]] as const) {
          expect(await service.getSuitabilitySuggestions(kind, tag.id)).toMatchObject({
            ok: true, data: [{ id: ids.perfume, priceFrom: { amountMinor: 12000 } }],
          });
          expect(await service.getSuitabilitySuggestions(kind, tag.id)).toEqual(await service.getSuitabilitySuggestions(kind, tag.id));
        }
        expect(await service.getSuitabilitySuggestions("mood", tags[2].id)).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
        await db.suitabilityTag.update({ where: { id: tags[0].id }, data: { active: false } });
        expect(await service.getSuitabilitySuggestions("mood", tags[0].id)).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
      } finally {
        await db.perfumeSuitability.deleteMany({ where: { tagId: { in: tags.map(tag => tag.id) } } });
        await db.suitabilityTag.deleteMany({ where: { id: { in: tags.map(tag => tag.id) } } });
      }
    });

    it("honors structured optional multi-select bounds, version and persisted responses", async () => {
      const questionId = seedId(9310);
      const optionIds = [seedId(9311), seedId(9312), seedId(9313)];
      const sortOrder = Math.max(...approvedQuizManifest.questions.map(question => question.sortOrder)) + 1;
      await db.quizQuestion.create({ data: {
        id: questionId, quizId: approvedQuizManifest.id, prompt: "Synthetic optional preferences", sortOrder,
        required: false, minSelections: 0, maxSelections: 2,
      } });
      let runId: string | undefined;
      try {
        for (const [index, value] of [ids.family, ids.woodyFamily, ids.intensity].entries()) {
          const optionId = optionIds[index];
          if (!optionId) throw new Error("Missing synthetic quiz option ID.");
          await db.quizOption.create({ data: { id: optionId, questionId, label: `Synthetic option ${index}`, value, sortOrder: index } });
        }
        const definition = await service.getQuiz();
        expect(definition.ok).toBe(true);
        if (definition.ok) {
          expect(definition.data.questions.find(question => question.id === questionId)).toEqual({
            id: questionId,
            prompt: "Synthetic optional preferences",
            required: false,
            minSelections: 0,
            maxSelections: 2,
            options: optionIds.map((id, index) => ({ id, label: `Synthetic option ${index}` })),
          });
        }
        expect(await service.getCandidateContext({ ...request, quizVersion: "obsolete" })).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
        expect(await service.generate({ ...request, answers: [...request.answers, { questionId, optionIds }] })).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
        const submittedAnswers = [...request.answers, { questionId, optionIds: optionIds.slice(0, 2) }];
        const result = await service.generate({ ...request, answers: submittedAnswers });
        expect(result.ok).toBe(true);
        if (result.ok) {
          runId = result.data.runId;
          const run = await db.recommendationRun.findUniqueOrThrow({ where: { id: runId }, include: { quizAttempt: { include: { responses: true } } } });
          expect(run.quizAttempt?.responses).toHaveLength(submittedAnswers.flatMap(answer => answer.optionIds).length);
          expect(run.quizAttempt?.responses.map(response => ({ questionId: response.questionId, optionId: response.optionId }))).toEqual(expect.arrayContaining(
            submittedAnswers.flatMap(answer => answer.optionIds.map(optionId => ({ questionId: answer.questionId, optionId }))),
          ));
          expect(run.quizAttempt?.status).toBe("COMPLETED");
          expect(result.data.fallback).toBe(true);
        }
      } finally {
        if (runId) await removeRun(db, runId);
        await db.quizOption.deleteMany({ where: { questionId } });
        await db.quizQuestion.delete({ where: { id: questionId } });
      }
    });

    it("builds repeatable bounded context from visible active catalogue only", async () => {
      const unpricedId = seedId(9320);
      await db.perfume.create({ data: {
        id: unpricedId, slug: "synthetic-unpriced", name: "Synthetic Unpriced", description: "Test-only perfume", primaryFamilyId: approvedCatalogueFamilyIds.amber,
      } });
      try {
        const first = await service.getCandidateContext(request);
        expect(first).toEqual(await service.getCandidateContext(request));
        expect(first).toMatchObject({ ok: true, data: {
          selectedFamilies: [{ id: approvedCatalogueFamilyIds.amber, label: "Amber" }],
        } });
        if (first.ok) {
          expect(first.data.candidates.length).toBeLessThanOrEqual(12);
          expect(first.data.candidates.find(item => item.perfume.id === amberPerfume.id)).toMatchObject({
            perfume: { id: amberPerfume.id, priceFrom: { amountMinor: 3500, currency: "AUD" } },
          });
          expect(first.data.candidates.map(item => item.perfume.id)).not.toContain(unpricedId);
        }
        await db.perfume.update({ where: { id: amberPerfume.id }, data: { status: "ARCHIVED", archivedAt: new Date("2026-09-08T00:00:00.000Z") } });
        const archived = await service.getCandidateContext(request);
        expect(archived.ok).toBe(true);
        if (archived.ok) {
          expect(archived.data.candidates.length).toBeLessThanOrEqual(12);
          expect(archived.data.candidates.map(item => item.perfume.id)).not.toContain(amberPerfume.id);
        }
      } finally {
        await db.perfume.update({ where: { id: amberPerfume.id }, data: { status: "ACTIVE", archivedAt: null } });
        await db.perfume.delete({ where: { id: unpricedId } });
      }
    });

    it("returns family wheel and virtual profile with ordered notes, classifications and suitability", async () => {
      const middle = seedId(9330);
      const base = seedId(9331);
      const daypart = seedId(9332);
      const season = seedId(9333);
      try {
        expect(await service.getVirtualScentProfile(ids.perfume)).toMatchObject({ ok: true, data: {
          noteJourney: { top: [{ id: ids.note }], middle: [], base: [] }, longevity: null, projection: null,
        } });
        await db.fragranceNote.createMany({ data: [
          { id: middle, name: "Synthetic Jasmine" }, { id: base, name: "Synthetic Musk" },
        ] });
        await db.perfumeNote.createMany({ data: [
          { perfumeId: ids.perfume, noteId: middle, layer: "MIDDLE" },
          { perfumeId: ids.perfume, noteId: base, layer: "BASE" },
        ] });
        await db.suitabilityTag.createMany({ data: [
          { id: daypart, category: "DAYPART", value: "Synthetic evening" },
          { id: season, category: "SEASON", value: "Synthetic summer" },
        ] });
        await db.perfumeSuitability.createMany({ data: [
          { perfumeId: ids.perfume, tagId: daypart }, { perfumeId: ids.perfume, tagId: season },
        ] });
        await db.perfume.update({ where: { id: ids.perfume }, data: { longevity: "Moderate", projection: "Soft" } });
        expect(await service.getVirtualScentProfile(ids.perfume)).toMatchObject({ ok: true, data: {
          family: { id: ids.family, label: "Citrus" }, noteJourney: {
            top: [{ id: ids.note }], middle: [{ id: middle }], base: [{ id: base }],
          }, longevity: { label: "Moderate" }, projection: { label: "Soft" },
          suitability: { daypart: [{ id: daypart }], season: [{ id: season }] },
        } });
        const wheel = await service.getFragranceWheel();
        expect(wheel.ok).toBe(true);
        if (wheel.ok) expect(wheel.data.find(item => item.family.id === ids.family)?.perfumes.map(item => item.id)).toContain(ids.perfume);
        await db.perfume.update({ where: { id: ids.perfume }, data: { status: "ARCHIVED", archivedAt: new Date("2026-09-08T00:00:00.000Z") } });
        expect(await service.getVirtualScentProfile(ids.perfume)).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
        const archivedWheel = await service.getFragranceWheel();
        if (archivedWheel.ok) expect(archivedWheel.data.find(item => item.family.id === ids.family)?.perfumes.map(item => item.id)).not.toContain(ids.perfume);
      } finally {
        await db.perfume.update({ where: { id: ids.perfume }, data: { status: "ACTIVE", archivedAt: null, longevity: null, projection: null } });
        await db.perfumeSuitability.deleteMany({ where: { tagId: { in: [daypart, season] } } });
        await db.suitabilityTag.deleteMany({ where: { id: { in: [daypart, season] } } });
        await db.perfumeNote.deleteMany({ where: { noteId: { in: [middle, base] } } });
        await db.fragranceNote.deleteMany({ where: { id: { in: [middle, base] } } });
      }
    });

    it("offers only strictly compatible active layering partners", async () => {
      const perfumeId = seedId(9340);
      const variantId = seedId(9341);
      await db.perfume.update({ where: { id: ids.perfume }, data: { longevity: "Moderate" } });
      await db.perfume.create({ data: {
        id: perfumeId, slug: "synthetic-layering", name: "Synthetic Layering", description: "Test-only perfume",
        primaryFamilyId: ids.family, intensityId: ids.intensity, longevity: "Moderate",
      } });
      try {
        await db.perfumeNote.create({ data: { perfumeId, noteId: ids.note, layer: "TOP" } });
        await db.perfumeVariant.create({ data: {
          id: variantId, perfumeId, sku: "SYNTH-LAYERING-50", bottleSize: "50 ml", concentration: "Eau de Parfum",
          priceMinor: 13000, currency: "AUD",
        } });
        expect(await service.getLayeringSuggestions(ids.perfume)).toMatchObject({ ok: true, data: {
          suggestions: [{ perfume: { id: perfumeId }, sharedNoteIds: [ids.note] }],
        } });
        await db.perfume.update({ where: { id: perfumeId }, data: { longevity: "Long" } });
        expect(await service.getLayeringSuggestions(ids.perfume)).toMatchObject({ ok: true, data: { suggestions: [] } });
        await db.perfume.update({ where: { id: perfumeId }, data: { longevity: null } });
        expect(await service.getLayeringSuggestions(ids.perfume)).toMatchObject({ ok: true, data: { suggestions: [] } });
        await db.perfume.update({ where: { id: perfumeId }, data: { longevity: "Moderate", status: "ARCHIVED", archivedAt: new Date("2026-09-08T00:00:00.000Z") } });
        expect(await service.getLayeringSuggestions(ids.perfume)).toMatchObject({ ok: true, data: { suggestions: [] } });
      } finally {
        await db.perfumeVariant.deleteMany({ where: { perfumeId } });
        await db.perfumeNote.deleteMany({ where: { perfumeId } });
        await db.perfume.delete({ where: { id: perfumeId } });
        await db.perfume.update({ where: { id: ids.perfume }, data: { longevity: null } });
      }
    });
  });
}
