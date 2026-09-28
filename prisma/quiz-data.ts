import { approvedCatalogueFamilyIds, approvedCatalogueNoteIds } from "./catalogue-data";

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
  id: quizId(930),
  version: "3",
  questions: [{
    id: quizId(931),
    prompt: "Which fragrance family would you like to explore?",
    sortOrder: 1,
    required: true,
    minSelections: 1,
    maxSelections: 1,
    options: [
      { id: quizId(932), label: "Amber", value: approvedCatalogueFamilyIds.amber, sortOrder: 1 },
      { id: quizId(933), label: "Fruity", value: approvedCatalogueFamilyIds.fruity, sortOrder: 2 },
      { id: quizId(934), label: "Vanilla", value: approvedCatalogueFamilyIds.vanilla, sortOrder: 3 },
      { id: quizId(935), label: "Warm Spicy", value: approvedCatalogueFamilyIds.warmSpicy, sortOrder: 4 },
    ],
  }, {
    id: quizId(936),
    prompt: "Which opening notes draw you in?",
    sortOrder: 2,
    required: true,
    minSelections: 1,
    maxSelections: 2,
    options: [
      { id: quizId(937), label: "Mango", value: approvedCatalogueNoteIds.mango, sortOrder: 1 },
      { id: quizId(938), label: "Orange", value: approvedCatalogueNoteIds.orange, sortOrder: 2 },
      { id: quizId(939), label: "Tangerine", value: approvedCatalogueNoteIds.tangerine, sortOrder: 3 },
      { id: quizId(940), label: "Bergamot", value: approvedCatalogueNoteIds.bergamot, sortOrder: 4 },
    ],
  }, {
    id: quizId(941),
    prompt: "Which heart notes feel most like you?",
    sortOrder: 3,
    required: true,
    minSelections: 1,
    maxSelections: 2,
    options: [
      { id: quizId(942), label: "Lotus", value: approvedCatalogueNoteIds.lotus, sortOrder: 1 },
      { id: quizId(943), label: "Jasmine", value: approvedCatalogueNoteIds.jasmine, sortOrder: 2 },
      { id: quizId(944), label: "May Rose", value: approvedCatalogueNoteIds.mayRose, sortOrder: 3 },
      { id: quizId(945), label: "Lavender", value: approvedCatalogueNoteIds.lavender, sortOrder: 4 },
    ],
  }, {
    id: quizId(946),
    prompt: "Which lasting notes would you like to wear?",
    sortOrder: 4,
    required: true,
    minSelections: 1,
    maxSelections: 2,
    options: [
      { id: quizId(947), label: "Vanilla", value: approvedCatalogueNoteIds.vanilla, sortOrder: 1 },
      { id: quizId(948), label: "Sandalwood", value: approvedCatalogueNoteIds.sandalwood, sortOrder: 2 },
      { id: quizId(949), label: "Patchouli", value: approvedCatalogueNoteIds.patchouli, sortOrder: 3 },
      { id: quizId(950), label: "Tonka Bean", value: approvedCatalogueNoteIds.tonkaBean, sortOrder: 4 },
    ],
  }],
} as const satisfies ApprovedQuizManifest;
