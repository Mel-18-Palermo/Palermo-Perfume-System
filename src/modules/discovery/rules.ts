import type { LayeringAssessment, LayeringCharacteristics, SuitabilityKind } from "./types";

export const suitabilityCategory: Readonly<Record<SuitabilityKind, "MOOD" | "OCCASION" | "WEATHER">> = {
  mood: "MOOD", occasion: "OCCASION", weather: "WEATHER",
};

/** Conservative D-029 rule over exact, approved catalogue characteristics. */
export function assessLayering(a: LayeringCharacteristics, b: LayeringCharacteristics): LayeringAssessment {
  if (!a.familyId || !b.familyId || !a.intensityId || !b.intensityId
    || !a.longevity || !b.longevity || a.noteIds.length === 0 || b.noteIds.length === 0) {
    return "INSUFFICIENT_DATA";
  }
  if (a.familyId !== b.familyId || a.intensityId !== b.intensityId || a.longevity !== b.longevity) {
    return "NOT_RECOMMENDED";
  }
  return a.noteIds.some(id => b.noteIds.includes(id)) ? "COMPATIBLE" : "NOT_RECOMMENDED";
}
