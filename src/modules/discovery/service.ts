import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "../../lib/db/generated/client";
import type { PerfumeSummary } from "../../contracts/catalogue";
import type { QuizDefinition, RecommendationRequest, RecommendationResult } from "../../contracts/recommendations";
import type { ApiResult } from "../../contracts/common";
import { failure, success } from "../../lib/api/result";

const quizInclude = { questions: { include: { options: true }, orderBy: { sortOrder: "asc" as const } } } as const;
const perfumeInclude = { primaryFamily: true, intensity: true, images: { orderBy: { sortOrder: "asc" as const } }, variants: { select: { priceMinor: true, currency: true, availability: true } } } as const;
type QuizQuestionRecord = { id: string; prompt: string; required: boolean; minSelections: number; maxSelections: number; sortOrder: number; options: Array<{ id: string; label: string; value: string; sortOrder: number }> };
type Quiz = { id: string; version: string; questions: QuizQuestionRecord[] };
type Perfume = Prisma.PerfumeGetPayload<{ include: typeof perfumeInclude }>;
function id(value: string): boolean { return /^[0-9a-f-]{10,64}$/i.test(value); }
function summary(perfume: Perfume): PerfumeSummary { const variants = perfume.variants.filter(item => item.availability !== "UNAVAILABLE"); const lowest = variants.reduce((value, item) => Math.min(value, item.priceMinor), Number.MAX_SAFE_INTEGER); return { id: perfume.id, slug: perfume.slug, name: perfume.name, primaryFamily: { id: perfume.primaryFamily.id, label: perfume.primaryFamily.name }, imageUrl: perfume.images[0]?.url ?? null, priceFrom: { amountMinor: lowest === Number.MAX_SAFE_INTEGER ? 0 : lowest, currency: variants[0]?.currency ?? "AUD" }, intensity: perfume.intensity ? { id: perfume.intensity.id, label: perfume.intensity.name } : null }; }

export class DiscoveryService {
  constructor(private readonly db: PrismaClient, private readonly now: () => Date = () => new Date()) {}
  async getQuiz(): Promise<ApiResult<QuizDefinition>> { const quiz = await this.db.quiz.findFirst({ where: { active: true }, include: quizInclude, orderBy: { version: "desc" } }) as Quiz | null; if (!quiz) return failure("NOT_FOUND"); return success(this.quizDto(quiz)); }
  private quizDto(quiz: Quiz): QuizDefinition { return { id: quiz.id, version: quiz.version, questions: quiz.questions.map(question => ({ id: question.id, prompt: question.prompt, required: question.required, minSelections: question.minSelections, maxSelections: question.maxSelections, options: [...question.options].sort((a, b) => a.sortOrder - b.sortOrder).map(option => ({ id: option.id, label: option.label })) })) }; }
  async generate(input: RecommendationRequest): Promise<ApiResult<RecommendationResult>> {
    if (!id(input.quizId) || !input.quizVersion || !Array.isArray(input.answers)) return failure("VALIDATION_ERROR");
    const quiz = await this.db.quiz.findUnique({ where: { id_version: { id: input.quizId, version: input.quizVersion }, active: true }, include: quizInclude }) as Quiz | null; if (!quiz) return failure("CONFLICT");
    const answers = input.answers as readonly { questionId: string; optionIds: readonly string[] }[];
    const questions = new Map<string, QuizQuestionRecord>(quiz.questions.map(question => [question.id, question] as const)); const seen = new Set<string>(); const values: string[] = [];
    for (const answer of answers) { const question = questions.get(answer.questionId); if (!question || seen.has(answer.questionId) || !Array.isArray(answer.optionIds) || new Set(answer.optionIds).size !== answer.optionIds.length || answer.optionIds.length < question.minSelections || answer.optionIds.length > question.maxSelections) return failure("VALIDATION_ERROR"); seen.add(answer.questionId); const options = new Map<string, { id: string; label: string; value: string; sortOrder: number }>(question.options.map(option => [option.id, option] as const)); for (const optionId of answer.optionIds) { const option = options.get(optionId as string); if (!option) return failure("VALIDATION_ERROR"); const value = option.value as string; values.push(value); } }
    if (quiz.questions.some(question => question.required && !seen.has(question.id))) return failure("VALIDATION_ERROR");
    const perfumes = await this.db.perfume.findMany({ where: { status: "ACTIVE", OR: [{ primaryFamilyId: { in: values } }, { intensityId: { in: values } }] }, include: perfumeInclude, orderBy: [{ name: "asc" }, { id: "asc" }], take: 12 });
    const runId = randomUUID(); const attemptId = randomUUID();
    await this.db.$transaction(async tx => { await tx.quizAttempt.create({ data: { id: attemptId, quizId: quiz.id, quizVersion: quiz.version, visitorSessionKey: `quiz-${attemptId}`, status: "COMPLETED", startedAt: this.now(), completedAt: this.now(), responses: { create: answers.flatMap(answer => answer.optionIds.map(optionId => ({ questionId: answer.questionId, optionId }))) } } }); await tx.recommendationRun.create({ data: { id: runId, quizAttemptId: attemptId, status: "FALLBACK", createdAt: this.now(), items: { create: perfumes.map((perfume, index) => ({ perfumeId: perfume.id, rank: index + 1, explanation: "Deterministic catalogue match from the selected quiz attributes." })) } } }); });
    return success({ runId, generatedAt: this.now().toISOString(), fallback: true, items: perfumes.map(perfume => ({ perfumeId: perfume.id, perfume: summary(perfume), reason: "Deterministic catalogue match from the selected quiz attributes." })) });
  }
}
