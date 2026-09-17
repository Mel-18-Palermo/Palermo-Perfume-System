import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "../../lib/db/generated/client";
import type { NoteAssignment, PerfumeSummary, SuitabilitySummary } from "../../contracts/catalogue";
import type { ApiResult, Option } from "../../contracts/common";
import type { QuizDefinition, RecommendationRequest, RecommendationResult } from "../../contracts/recommendations";
import { failure, success } from "../../lib/api/result";
import { assessLayering, suitabilityCategory } from "./rules";
import type { CandidateContext, CandidateRecord, FragranceWheelFamily, LayeringCharacteristics, LayeringResult, SuitabilityKind, VirtualScentProfile } from "./types";

const quizInclude = { questions: { include: { options: true }, orderBy: { sortOrder: "asc" as const } } } as const;
const perfumeInclude = {
  primaryFamily: true, intensity: true,
  images: { orderBy: { sortOrder: "asc" as const } },
  variants: { select: { priceMinor: true, currency: true, availability: true } },
  notes: { include: { note: true } }, suitability: { include: { tag: true } },
} as const;
const visibleVariant: Prisma.PerfumeVariantWhereInput = { availability: { in: ["AVAILABLE", "OUT_OF_STOCK"] } };
const publicPerfume: Prisma.PerfumeWhereInput = {
  status: "ACTIVE", primaryFamily: { active: true }, variants: { some: visibleVariant },
};
const isId = (value: unknown): value is string => typeof value === "string"
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const option = (id: string, label: string): Option => ({ id, label });
type Quiz = Prisma.QuizGetPayload<{ include: typeof quizInclude }>;
type Perfume = Prisma.PerfumeGetPayload<{ include: typeof perfumeInclude }>;
type Answer = Readonly<{ questionId: string; optionIds: readonly string[] }>;
type Validated = Readonly<{ quiz: Quiz; answers: readonly Answer[]; values: readonly string[] }>;

function suitability(perfume: Perfume): SuitabilitySummary {
  const result: { occasion: Option[]; mood: Option[]; weather: Option[]; daypart: Option[]; season: Option[] } = {
    occasion: [], mood: [], weather: [], daypart: [], season: [],
  };
  for (const { tag } of perfume.suitability) {
    if (!tag.active) continue;
    switch (tag.category) {
      case "OCCASION": result.occasion.push(option(tag.id, tag.value)); break;
      case "MOOD": result.mood.push(option(tag.id, tag.value)); break;
      case "WEATHER": result.weather.push(option(tag.id, tag.value)); break;
      case "DAYPART": result.daypart.push(option(tag.id, tag.value)); break;
      case "SEASON": result.season.push(option(tag.id, tag.value)); break;
    }
  }
  for (const values of Object.values(result)) values.sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
  return result;
}

function notes(perfume: Perfume): NoteAssignment[] {
  const layerRank = { TOP: 0, MIDDLE: 1, BASE: 2 } as const;
  return perfume.notes.filter(({ note }) => note.active).map(({ note, layer }) => ({
    id: note.id, label: note.name, description: note.description, layer,
  })).sort((a, b) => layerRank[a.layer] - layerRank[b.layer] || a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
}

function summary(perfume: Perfume): PerfumeSummary {
  const cheapest = perfume.variants.filter(variant => variant.availability !== "UNAVAILABLE")
    .sort((a, b) => a.priceMinor - b.priceMinor)[0];
  // All discovery queries require a visible variant; this is an invariant, not a synthetic price.
  if (!cheapest) throw new Error("Discovery candidate has no visible variant.");
  return {
    id: perfume.id, slug: perfume.slug, name: perfume.name,
    primaryFamily: option(perfume.primaryFamily.id, perfume.primaryFamily.name),
    imageUrl: perfume.images[0]?.url ?? null,
    priceFrom: { amountMinor: cheapest.priceMinor, currency: cheapest.currency },
    intensity: perfume.intensity?.active ? option(perfume.intensity.id, perfume.intensity.name) : null,
  };
}

function candidate(perfume: Perfume): CandidateRecord {
  return { perfume: summary(perfume), notes: notes(perfume), suitability: suitability(perfume) };
}

function quizDto(quiz: Quiz): QuizDefinition {
  return { id: quiz.id, version: quiz.version, questions: quiz.questions.map(question => ({
    id: question.id, prompt: question.prompt, required: question.required,
    minSelections: question.minSelections, maxSelections: question.maxSelections,
    options: [...question.options].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
      .map(value => option(value.id, value.label)),
  })) };
}

function characteristics(perfume: Perfume): LayeringCharacteristics {
  return {
    familyId: perfume.primaryFamily.active ? perfume.primaryFamilyId : null,
    intensityId: perfume.intensity?.active ? perfume.intensityId : null,
    longevity: perfume.longevity,
    noteIds: notes(perfume).map(value => value.id),
  };
}

export class DiscoveryService {
  constructor(private readonly db: PrismaClient, private readonly now: () => Date = () => new Date()) {}

  async getQuiz(): Promise<ApiResult<QuizDefinition>> {
    const quiz = await this.db.quiz.findFirst({ where: { active: true }, include: quizInclude, orderBy: [{ version: "desc" }, { id: "asc" }] });
    return quiz ? success(quizDto(quiz)) : failure("NOT_FOUND");
  }

  private async validateRequest(input: RecommendationRequest): Promise<ApiResult<Validated>> {
    if (!input || typeof input !== "object" || !isId(input.quizId)
      || typeof input.quizVersion !== "string" || !input.quizVersion.trim()
      || !Array.isArray(input.answers)) return failure("VALIDATION_ERROR");
    const quiz = await this.db.quiz.findUnique({
      where: { id_version: { id: input.quizId, version: input.quizVersion }, active: true }, include: quizInclude,
    });
    if (!quiz) return failure("CONFLICT");
    const questions = new Map(quiz.questions.map(question => [question.id, question] as const));
    const seen = new Set<string>();
    const values: string[] = [];
    const answers: Answer[] = [];
    for (const raw of input.answers as readonly unknown[]) {
      if (!raw || typeof raw !== "object" || !("questionId" in raw) || !("optionIds" in raw)) return failure("VALIDATION_ERROR");
      const questionId = raw.questionId;
      const optionIds = raw.optionIds;
      if (!isId(questionId) || !Array.isArray(optionIds) || !optionIds.every(isId)) return failure("VALIDATION_ERROR");
      const question = questions.get(questionId);
      if (!question || seen.has(questionId) || new Set(optionIds).size !== optionIds.length
        || optionIds.length < question.minSelections || optionIds.length > question.maxSelections) return failure("VALIDATION_ERROR");
      seen.add(questionId);
      const options = new Map(question.options.map(value => [value.id, value] as const));
      for (const optionId of optionIds) {
        const selected = options.get(optionId);
        if (!selected) return failure("VALIDATION_ERROR");
        values.push(selected.value);
      }
      answers.push({ questionId, optionIds });
    }
    if (quiz.questions.some(question => question.required && !seen.has(question.id))) return failure("VALIDATION_ERROR");
    return success({ quiz, answers, values });
  }

  private async candidateContext(validated: Validated): Promise<ApiResult<CandidateContext>> {
    const ids = [...new Set(validated.values)];
    const [families, intensities, selectedNotes, tags] = await Promise.all([
      this.db.fragranceFamily.findMany({ where: { id: { in: ids }, active: true }, orderBy: [{ name: "asc" }, { id: "asc" }] }),
      this.db.intensity.findMany({ where: { id: { in: ids }, active: true }, orderBy: [{ name: "asc" }, { id: "asc" }] }),
      this.db.fragranceNote.findMany({ where: { id: { in: ids }, active: true }, orderBy: [{ name: "asc" }, { id: "asc" }] }),
      this.db.suitabilityTag.findMany({ where: { id: { in: ids }, active: true }, orderBy: [{ category: "asc" }, { value: "asc" }, { id: "asc" }] }),
    ]);
    const resolved = [...families, ...intensities, ...selectedNotes, ...tags].map(value => value.id);
    if (resolved.length !== ids.length || new Set(resolved).size !== ids.length) return failure("CONFLICT");
    const selectedSuitability: { occasion: Option[]; mood: Option[]; weather: Option[]; daypart: Option[]; season: Option[] } = {
      occasion: [], mood: [], weather: [], daypart: [], season: [],
    };
    for (const tag of tags) {
      switch (tag.category) {
        case "OCCASION": selectedSuitability.occasion.push(option(tag.id, tag.value)); break;
        case "MOOD": selectedSuitability.mood.push(option(tag.id, tag.value)); break;
        case "WEATHER": selectedSuitability.weather.push(option(tag.id, tag.value)); break;
        case "DAYPART": selectedSuitability.daypart.push(option(tag.id, tag.value)); break;
        case "SEASON": selectedSuitability.season.push(option(tag.id, tag.value)); break;
      }
    }
    const criteria: Prisma.PerfumeWhereInput[] = [
      ...(families.length ? [{ primaryFamilyId: { in: families.map(value => value.id) } }] : []),
      ...(intensities.length ? [{ intensityId: { in: intensities.map(value => value.id) } }] : []),
      ...(selectedNotes.length ? [{ notes: { some: { noteId: { in: selectedNotes.map(value => value.id) } } } }] : []),
      ...(tags.length ? [{ suitability: { some: { tagId: { in: tags.map(value => value.id) } } } }] : []),
    ];
    const perfumes = await this.db.perfume.findMany({
      where: { ...publicPerfume, ...(criteria.length ? { OR: criteria } : {}) },
      include: perfumeInclude, orderBy: [{ name: "asc" }, { id: "asc" }], take: 100,
    });
    const selected = new Set(ids);
    const candidates = perfumes.map(perfume => {
      const record = candidate(perfume);
      const score = Number(selected.has(perfume.primaryFamilyId)) + Number(!!perfume.intensityId && selected.has(perfume.intensityId))
        + record.notes.filter(value => selected.has(value.id)).length
        + Object.values(record.suitability).flat().filter(value => selected.has(value.id)).length;
      return { record, score };
    }).sort((a, b) => b.score - a.score || a.record.perfume.name.localeCompare(b.record.perfume.name)
      || a.record.perfume.id.localeCompare(b.record.perfume.id)).slice(0, 12).map(value => value.record);
    return success({
      quizId: validated.quiz.id, quizVersion: validated.quiz.version,
      selectedFamilies: families.map(value => option(value.id, value.name)),
      selectedIntensities: intensities.map(value => option(value.id, value.name)),
      selectedNotes: selectedNotes.map(value => option(value.id, value.name)),
      selectedSuitability, candidates,
    });
  }

  async getCandidateContext(input: RecommendationRequest): Promise<ApiResult<CandidateContext>> {
    const validated = await this.validateRequest(input);
    return validated.ok ? this.candidateContext(validated.data) : validated;
  }

  async generate(input: RecommendationRequest): Promise<ApiResult<RecommendationResult>> {
    const validated = await this.validateRequest(input);
    if (!validated.ok) return validated;
    const context = await this.candidateContext(validated.data);
    if (!context.ok) return context;
    const runId = randomUUID();
    const attemptId = randomUUID();
    const time = this.now();
    const reason = "Deterministic match to approved quiz and catalogue attributes.";
    await this.db.$transaction(async tx => {
      await tx.quizAttempt.create({ data: {
        id: attemptId, quizId: validated.data.quiz.id, quizVersion: validated.data.quiz.version,
        visitorSessionKey: `quiz-${attemptId}`, status: "COMPLETED", startedAt: time, completedAt: time,
        responses: { create: validated.data.answers.flatMap(answer => answer.optionIds.map(optionId => ({ questionId: answer.questionId, optionId }))) },
      } });
      await tx.recommendationRun.create({ data: {
        id: runId, quizAttemptId: attemptId, status: "FALLBACK", createdAt: time,
        items: { create: context.data.candidates.map((item, index) => ({ perfumeId: item.perfume.id, rank: index + 1, explanation: reason })) },
      } });
    });
    return success({ runId, generatedAt: time.toISOString(), fallback: true,
      items: context.data.candidates.map(item => ({ perfumeId: item.perfume.id, perfume: item.perfume, reason })) });
  }

  /** A controlled tag ID is the only mood/occasion/weather input; no live weather lookup. */
  async getSuitabilitySuggestions(kind: SuitabilityKind, tagId: string): Promise<ApiResult<readonly PerfumeSummary[]>> {
    if (!Object.hasOwn(suitabilityCategory, kind) || !isId(tagId)) return failure("VALIDATION_ERROR");
    const tag = await this.db.suitabilityTag.findFirst({ where: { id: tagId, category: suitabilityCategory[kind], active: true } });
    if (!tag) return failure("NOT_FOUND");
    const perfumes = await this.db.perfume.findMany({
      where: { ...publicPerfume, suitability: { some: { tagId } } }, include: perfumeInclude,
      orderBy: [{ name: "asc" }, { id: "asc" }], take: 100,
    });
    return success(perfumes.map(summary));
  }

  async getFragranceWheel(): Promise<ApiResult<readonly FragranceWheelFamily[]>> {
    const families = await this.db.fragranceFamily.findMany({
      where: { active: true }, orderBy: [{ name: "asc" }, { id: "asc" }],
      include: { perfumes: { where: publicPerfume, include: perfumeInclude, orderBy: [{ name: "asc" }, { id: "asc" }] } },
    });
    return success(families.map(family => ({
      family: option(family.id, family.name), perfumes: family.perfumes.map(summary),
    })));
  }

  async getVirtualScentProfile(perfumeId: string): Promise<ApiResult<VirtualScentProfile>> {
    if (!isId(perfumeId)) return failure("VALIDATION_ERROR");
    const perfume = await this.db.perfume.findFirst({ where: { ...publicPerfume, id: perfumeId }, include: perfumeInclude });
    if (!perfume) return failure("NOT_FOUND");
    const assignments = notes(perfume);
    return success({
      perfume: summary(perfume), family: option(perfume.primaryFamily.id, perfume.primaryFamily.name),
      intensity: perfume.intensity?.active ? option(perfume.intensity.id, perfume.intensity.name) : null,
      noteJourney: {
        top: assignments.filter(value => value.layer === "TOP"),
        middle: assignments.filter(value => value.layer === "MIDDLE"),
        base: assignments.filter(value => value.layer === "BASE"),
      },
      longevity: perfume.longevity ? option(`longevity:${perfume.longevity}`, perfume.longevity) : null,
      projection: perfume.projection ? option(`projection:${perfume.projection}`, perfume.projection) : null,
      suitability: suitability(perfume),
    });
  }

  async getLayeringSuggestions(perfumeId: string): Promise<ApiResult<LayeringResult>> {
    if (!isId(perfumeId)) return failure("VALIDATION_ERROR");
    const target = await this.db.perfume.findFirst({ where: { ...publicPerfume, id: perfumeId }, include: perfumeInclude });
    if (!target) return failure("NOT_FOUND");
    const possible = await this.db.perfume.findMany({
      where: { ...publicPerfume, id: { not: perfumeId }, primaryFamilyId: target.primaryFamilyId },
      include: perfumeInclude, orderBy: [{ name: "asc" }, { id: "asc" }], take: 100,
    });
    const targetTraits = characteristics(target);
    const suggestions = possible.filter(value => assessLayering(targetTraits, characteristics(value)) === "COMPATIBLE")
      .slice(0, 12).map(value => ({
        perfume: summary(value), assessment: "COMPATIBLE" as const,
        sharedNoteIds: [...new Set(targetTraits.noteIds.filter(id => characteristics(value).noteIds.includes(id)))].sort(),
      }));
    return success({ targetPerfumeId: perfumeId, suggestions,
      guidance: ["Apply each selected fragrance separately.", "Assess the combination according to personal preference."],
    });
  }
}
