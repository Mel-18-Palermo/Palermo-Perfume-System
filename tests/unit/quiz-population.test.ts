import { describe, expect, it } from "vitest";
import { approvedCatalogueFamilyIds, approvedCatalogueNoteIds } from "../../prisma/catalogue-data";
import { approvedQuizManifest } from "../../prisma/quiz-data";
import { validateApprovedQuizManifest } from "../../prisma/quiz-population";

describe("approved canonical consultation manifest", () => {
  it("contains four required questions backed only by approved catalogue IDs", () => {
    expect(validateApprovedQuizManifest(approvedQuizManifest)).toEqual([]);
    expect(approvedQuizManifest.questions).toHaveLength(4);
    const question = approvedQuizManifest.questions[0];
    expect(question).toMatchObject({
      prompt: "Which fragrance family would you like to explore?",
      required: true,
      minSelections: 1,
      maxSelections: 1,
    });
    expect(question?.options.map(option => ({ label: option.label, value: option.value }))).toEqual([
      { label: "Amber", value: approvedCatalogueFamilyIds.amber },
      { label: "Fruity", value: approvedCatalogueFamilyIds.fruity },
      { label: "Vanilla", value: approvedCatalogueFamilyIds.vanilla },
      { label: "Warm Spicy", value: approvedCatalogueFamilyIds.warmSpicy },
    ]);
    expect(approvedQuizManifest.questions[1]?.options.map(option => option.value)).toContain(approvedCatalogueNoteIds.bergamot);
  });
});
