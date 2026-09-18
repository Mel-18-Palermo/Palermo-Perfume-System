import type { Option, EntityId } from "../../contracts/common";
import type { NoteAssignment, PerfumeSummary, SuitabilitySummary } from "../../contracts/catalogue";

export type SuitabilityKind = "mood" | "occasion" | "weather";

/** Bounded, current catalogue facts for deterministic ranking and the later AI adapter. */
export type CandidateRecord = Readonly<{
  perfume: PerfumeSummary;
  notes: readonly NoteAssignment[];
  suitability: SuitabilitySummary;
}>;
export type CandidateContext = Readonly<{
  quizId: EntityId;
  quizVersion: string;
  selectedFamilies: readonly Option[];
  selectedIntensities: readonly Option[];
  selectedNotes: readonly Option[];
  selectedSuitability: SuitabilitySummary;
  candidates: readonly CandidateRecord[];
}>;

export type FragranceWheelFamily = Readonly<{
  family: Option;
  perfumes: readonly PerfumeSummary[];
}>;
export type VirtualScentProfile = Readonly<{
  perfume: PerfumeSummary;
  family: Option;
  intensity: Option | null;
  noteJourney: Readonly<{
    top: readonly NoteAssignment[];
    middle: readonly NoteAssignment[];
    base: readonly NoteAssignment[];
  }>;
  longevity: Option | null;
  projection: Option | null;
  suitability: SuitabilitySummary;
}>;
export type LayeringAssessment = "COMPATIBLE" | "NOT_RECOMMENDED" | "INSUFFICIENT_DATA";
export type LayeringCharacteristics = Readonly<{
  familyId: EntityId | null;
  intensityId: EntityId | null;
  longevity: string | null;
  noteIds: readonly EntityId[];
}>;
export type LayeringSuggestion = Readonly<{
  perfume: PerfumeSummary;
  assessment: "COMPATIBLE";
  sharedNoteIds: readonly EntityId[];
}>;
export type LayeringResult = Readonly<{
  targetPerfumeId: EntityId;
  suggestions: readonly LayeringSuggestion[];
  /** Guidance describes application order only; it makes no scent-performance claim. */
  guidance: readonly string[];
}>;
