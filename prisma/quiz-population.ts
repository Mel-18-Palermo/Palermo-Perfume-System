import type { Prisma, PrismaClient } from "../src/lib/db/generated/client";
import { approvedCatalogueManifest, type ApprovedCatalogueManifest } from "./catalogue-data";
import { approvedQuizManifest, type ApprovedQuizManifest } from "./quiz-data";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const visibleAvailability = ["AVAILABLE", "OUT_OF_STOCK"] as const;

export class QuizManifestError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Approved quiz manifest is invalid:\n- ${issues.join("\n- ")}`);
  }
}

export class QuizPopulationConflictError extends Error {
  constructor(label: string) {
    super(`Quiz population conflict: ${label}.`);
  }
}

function text(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.trim() === value && value.length > 0 && value.length <= maximum;
}

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

export function validateApprovedQuizManifest(
  manifest: ApprovedQuizManifest,
  catalogue: ApprovedCatalogueManifest = approvedCatalogueManifest,
): readonly string[] {
  const issues: string[] = [];
  const ids = [manifest.id, ...manifest.questions.flatMap(question => [question.id, ...question.options.map(option => option.id)])];
  if (!unique(ids)) issues.push("Quiz, question and option IDs must be globally unique.");
  if (!ids.every(id => uuidPattern.test(id))) issues.push("Quiz, question and option IDs must use stable UUIDs.");
  if (!text(manifest.version, 80)) issues.push("Quiz version must be trimmed and 1-80 characters.");
  if (manifest.questions.length < 4 || manifest.questions.length > 6) issues.push("Canonical quiz must contain 4-6 purposeful questions.");

  const familyIds = new Set(catalogue.vocabulary.families.filter(family => family.active).map(family => family.id));
  const familyNames = new Map(catalogue.vocabulary.families.map(family => [family.id, family.name]));
  const noteIds = new Set(catalogue.vocabulary.notes.filter(note => note.active).map(note => note.id));
  const noteNames = new Map(catalogue.vocabulary.notes.map(note => [note.id, note.name]));
  for (const question of manifest.questions) {
    if (!text(question.prompt, 500) || !Number.isSafeInteger(question.sortOrder) || question.sortOrder < 1
      || !Number.isSafeInteger(question.minSelections) || !Number.isSafeInteger(question.maxSelections)
      || question.minSelections < 0 || question.maxSelections < question.minSelections) {
      issues.push("Quiz question has invalid text or selection bounds.");
    }
    if (!question.required || question.minSelections < 1 || question.maxSelections > 2) {
      issues.push("Canonical consultation questions must be required with one or two selections.");
    }
    if (!unique(question.options.map(option => option.id)) || !unique(question.options.map(option => String(option.sortOrder)))
      || !unique(question.options.map(option => option.value))) {
      issues.push("Quiz option IDs, values and sort orders must be unique per question.");
    }
    for (const option of question.options) {
      const canonicalLabel = familyNames.get(option.value) ?? noteNames.get(option.value);
      if (!text(option.label, 120) || !uuidPattern.test(option.id) || (!familyIds.has(option.value) && !noteIds.has(option.value))) {
        issues.push(`Quiz option ${option.label || "<unnamed>"} must reference an active canonical family or note.`);
      } else if (canonicalLabel !== option.label) {
        issues.push(`Quiz option ${option.label} must match its canonical catalogue label.`);
      }
    }
  }
  return issues;
}

export function assertApprovedQuizManifest(
  manifest: ApprovedQuizManifest,
  catalogue: ApprovedCatalogueManifest = approvedCatalogueManifest,
): void {
  const issues = validateApprovedQuizManifest(manifest, catalogue);
  if (issues.length) throw new QuizManifestError(issues);
}

async function assertIdentity(
  tx: Prisma.TransactionClient,
  manifest: ApprovedQuizManifest,
): Promise<void> {
  const quiz = await tx.quiz.findUnique({ where: { id: manifest.id } });
  if (quiz && quiz.version !== manifest.version) throw new QuizPopulationConflictError("quiz ID has a different version");
  for (const question of manifest.questions) {
    const current = await tx.quizQuestion.findUnique({ where: { id: question.id } });
    if (current && current.quizId !== manifest.id) throw new QuizPopulationConflictError("question ID belongs to another quiz");
    for (const option of question.options) {
      const existing = await tx.quizOption.findUnique({ where: { id: option.id } });
      if (existing && (existing.questionId !== question.id || existing.label !== option.label || existing.value !== option.value)) {
        throw new QuizPopulationConflictError("option ID has a different identity");
      }
    }
  }
}

export async function populateApprovedQuizInTransaction(
  tx: Prisma.TransactionClient,
  manifest: ApprovedQuizManifest = approvedQuizManifest,
  catalogue: ApprovedCatalogueManifest = approvedCatalogueManifest,
): Promise<void> {
  assertApprovedQuizManifest(manifest, catalogue);
  await assertIdentity(tx, manifest);

  const values = manifest.questions.flatMap(question => question.options.map(option => option.value));
  const families = await tx.fragranceFamily.findMany({
    where: {
      id: { in: values },
      active: true,
      perfumes: { some: { status: "ACTIVE", variants: { some: { availability: { in: [...visibleAvailability] } } } } },
    },
    select: { id: true },
  });
  const notes = await tx.fragranceNote.findMany({
    where: { id: { in: values }, active: true, perfumes: { some: { perfume: { status: "ACTIVE", variants: { some: { availability: { in: [...visibleAvailability] } } } } } } },
    select: { id: true },
  });
  if (new Set([...families.map(family => family.id), ...notes.map(note => note.id)]).size !== new Set(values).size) {
    throw new QuizPopulationConflictError("each quiz option must have an active recommendation-eligible catalogue product");
  }

  await tx.quiz.updateMany({ where: { active: true, id: { not: manifest.id } }, data: { active: false } });
  await tx.quiz.upsert({ where: { id: manifest.id }, update: { version: manifest.version, active: true }, create: {
    id: manifest.id, version: manifest.version, active: true,
  } });

  for (const question of manifest.questions) {
    const existingOptions = await tx.quizOption.findMany({ where: { questionId: question.id }, select: { id: true } });
    const declaredOptionIds = new Set(question.options.map(option => option.id));
    if (existingOptions.some(option => !declaredOptionIds.has(option.id))) {
      throw new QuizPopulationConflictError("canonical question has undeclared options");
    }
    const questionData = {
      quizId: manifest.id, prompt: question.prompt, sortOrder: question.sortOrder, required: question.required,
      minSelections: question.minSelections, maxSelections: question.maxSelections,
    };
    await tx.quizQuestion.upsert({ where: { id: question.id }, update: {
      quizId: manifest.id, prompt: question.prompt, sortOrder: question.sortOrder, required: question.required,
      minSelections: question.minSelections, maxSelections: question.maxSelections,
    }, create: { id: question.id, ...questionData } });
    for (const option of question.options) await tx.quizOption.upsert({ where: { id: option.id }, update: {
      questionId: question.id, label: option.label, value: option.value, sortOrder: option.sortOrder,
    }, create: { ...option, questionId: question.id } });
  }
}

export async function populateApprovedQuiz(
  db: PrismaClient,
  manifest: ApprovedQuizManifest = approvedQuizManifest,
  catalogue: ApprovedCatalogueManifest = approvedCatalogueManifest,
): Promise<void> {
  await db.$transaction(tx => populateApprovedQuizInTransaction(tx, manifest, catalogue), { timeout: 60_000 });
}
