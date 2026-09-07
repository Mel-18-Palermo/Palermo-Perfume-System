import type { Endpoint, EntityId, Timestamp } from "./common";
import type { PerfumeSummary } from "./catalogue";

export type QuizQuestion = Readonly<{
  id: EntityId; prompt: string; required: boolean; minSelections: number; maxSelections: number;
  options: readonly Readonly<{ id: EntityId; label: string }>[];
}>;
export type QuizDefinition = Readonly<{ id: EntityId; version: string; questions: readonly QuizQuestion[] }>;
export type RecommendationRequest = Readonly<{
  quizId: EntityId; quizVersion: string;
  answers: readonly Readonly<{ questionId: EntityId; optionIds: readonly EntityId[] }>[];
}>;
export type RecommendationItem = Readonly<{ perfumeId: EntityId; perfume: PerfumeSummary; reason: string }>;
export type RecommendationResult = Readonly<{
  runId: EntityId; items: readonly RecommendationItem[]; generatedAt: Timestamp; fallback: boolean;
}>;
export type RecommendationsApi = Readonly<{
  getQuiz: Endpoint<void, QuizDefinition>;
  generate: Endpoint<RecommendationRequest, RecommendationResult>;
}>;
