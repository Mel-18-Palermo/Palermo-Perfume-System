import { approvedCatalogueFamilyIds } from "./catalogue-data";

export type ApprovedQuizOption = Readonly<{
  id: string;
  label: string;
  value: string;
  sortOrder: number;
}>;

export type ApprovedQuizQuestion = Readonly<{
  id: string;
  prompt: string;
  sortOrder: number;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: readonly ApprovedQuizOption[];
}>;

export type ApprovedQuizManifest = Readonly<{
  id: string;
  version: string;
  questions: readonly ApprovedQuizQuestion[];
}>;

const quizId = (value: number): string =>
  `27100000-0000-4000-8000-${String(value).padStart(12, "0")}`;

/**
 * Customer-facing quiz configuration. Option values are controlled catalogue
 * IDs; labels do not define or duplicate the fragrance vocabulary.
 */
export const approvedQuizManifest = {
  id: quizId(900),
  version: "2",
  questions: [{
    id: quizId(901),
    prompt: "Which fragrance family would you like to explore?",
    sortOrder: 1,
    required: true,
    minSelections: 1,
    maxSelections: 1,
    options: [
      { id: quizId(902), label: "Amber", value: approvedCatalogueFamilyIds.amber, sortOrder: 1 },
      { id: quizId(903), label: "Fruity", value: approvedCatalogueFamilyIds.fruity, sortOrder: 2 },
      { id: quizId(904), label: "Vanilla", value: approvedCatalogueFamilyIds.vanilla, sortOrder: 3 },
      { id: quizId(905), label: "Warm Spicy", value: approvedCatalogueFamilyIds.warmSpicy, sortOrder: 4 },
    ],
  }],
} as const satisfies ApprovedQuizManifest;
