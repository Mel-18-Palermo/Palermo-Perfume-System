"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import type {
  QuizDefinition,
  RecommendationResult,
  RecommendationRequest,
  RecommendationItem,
} from "@/contracts/recommendations";
import type { MoneyValue } from "@/contracts/common";

function formatMoney(value: MoneyValue): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: value.currency,
  }).format(value.amountMinor / 100);
}

export function FragranceQuizView() {
  const [quiz, setQuiz] = React.useState<QuizDefinition | null>(null);
  const [loadingQuiz, setLoadingQuiz] = React.useState<boolean>(true);
  const [quizLoadError, setQuizLoadError] = React.useState<string | null>(null);

  const [answers, setAnswers] = React.useState<Record<string, string[]>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState<number>(0);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<RecommendationResult | null>(null);
  const submissionInFlightRef = React.useRef(false);

  const handleRetryQuiz = React.useCallback(() => {
    setLoadingQuiz(true);
    setQuizLoadError(null);
    void api.recommendations
      .getQuiz()
      .then((res) => {
        if (res.ok) {
          setQuiz(res.data);
        } else {
          setQuizLoadError(res.error.message || "Failed to load the fragrance quiz.");
        }
      })
      .catch(() => {
        setQuizLoadError("Network error while loading questionnaire. Please refresh.");
      })
      .finally(() => {
        setLoadingQuiz(false);
      });
  }, []);

  React.useEffect(() => {
    let active = true;

    void api.recommendations
      .getQuiz()
      .then((res) => {
        if (!active) return;
        if (res.ok) {
          setQuiz(res.data);
        } else {
          setQuizLoadError(res.error.message || "Failed to load the fragrance quiz.");
        }
      })
      .catch(() => {
        if (!active) return;
        setQuizLoadError("Network error while loading questionnaire. Please refresh.");
      })
      .finally(() => {
        if (active) setLoadingQuiz(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const currentQuestion = quiz?.questions[currentQuestionIndex];
  const totalQuestions = quiz?.questions.length ?? 0;

  const handleOptionToggle = (questionId: string, optionId: string, maxSelections: number) => {
    if (isSubmitting) return;
    setValidationError(null);
    setAnswers((prev) => {
      const currentSelections = prev[questionId] ?? [];
      if (maxSelections === 1) {
        return { ...prev, [questionId]: [optionId] };
      }

      if (currentSelections.includes(optionId)) {
        return {
          ...prev,
          [questionId]: currentSelections.filter((id) => id !== optionId),
        };
      }

      if (currentSelections.length >= maxSelections) {
        setValidationError(`You may select up to ${maxSelections} options for this question.`);
        return prev;
      }

      return {
        ...prev,
        [questionId]: [...currentSelections, optionId],
      };
    });
  };

  const handleNext = () => {
    if (!currentQuestion) return;
    const selected = answers[currentQuestion.id] ?? [];

    if (currentQuestion.required && selected.length < currentQuestion.minSelections) {
      setValidationError(
        `Please select at least ${currentQuestion.minSelections} option${
          currentQuestion.minSelections > 1 ? "s" : ""
        } before continuing.`
      );
      return;
    }

    if (!currentQuestion.required && selected.length > 0 && selected.length < currentQuestion.minSelections) {
      setValidationError(
        `Please select at least ${currentQuestion.minSelections} options or deselect all to skip.`
      );
      return;
    }

    setValidationError(null);
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setValidationError(null);
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!quiz || submissionInFlightRef.current) return;

    for (const q of quiz.questions) {
      const selections = answers[q.id] ?? [];
      if (q.required && selections.length < q.minSelections) {
        setValidationError(`Please answer question "${q.prompt}".`);
        return;
      }
      if (!q.required && selections.length > 0 && selections.length < q.minSelections) {
        setValidationError(
          `Question "${q.prompt}" requires at least ${q.minSelections} selections if partially answered.`
        );
        return;
      }
    }

    submissionInFlightRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    const validAnswers = Object.entries(answers)
      .filter(([, optionIds]) => Array.isArray(optionIds) && optionIds.length > 0)
      .map(([questionId, optionIds]) => ({
        questionId,
        optionIds,
      }));

    const payload: RecommendationRequest = {
      quizId: quiz.id,
      quizVersion: quiz.version,
      answers: validAnswers,
    };

    try {
      const res = await api.recommendations.generate(payload);
      if (res.ok) {
        setResult(res.data);
      } else {
        setSubmitError(res.error.message || "Failed to generate recommendations.");
      }
    } catch {
      setSubmitError("Network connection interrupted. Please try again.");
    } finally {
      submissionInFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setValidationError(null);
    setSubmitError(null);
  };

  if (loadingQuiz) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center text-muted-foreground" role="status">
        <p>Loading fragrance profile questionnaire...</p>
      </div>
    );
  }

  if (quizLoadError || !quiz) {
    return (
      <div className="mx-auto max-w-2xl py-12 space-y-4 text-center">
        <Alert variant="danger" role="alert">
          <p className="font-semibold">Unable to Load Quiz</p>
          <p className="text-sm">{quizLoadError || "Quiz definition is currently unavailable."}</p>
        </Alert>
        <div className="flex justify-center gap-3">
          <Button onClick={handleRetryQuiz}>Retry</Button>
          <Link
            href="/catalogue"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
          >
            Return to Catalogue
          </Link>
        </div>
      </div>
    );
  }

  if (result) {
    const items: readonly RecommendationItem[] = result.items;
    const hasItems = items.length > 0;
    const [featured, ...remaining] = items;

    function productImage(
      item: RecommendationItem,
      options: Readonly<{ priority?: boolean; sizes: string }>
    ) {
      return (
        <div className="relative h-full w-full overflow-hidden bg-surface-muted">
          {item.perfume.imageUrl ? (
            <Image
              src={item.perfume.imageUrl}
              alt={item.perfume.name}
              fill
              priority={options.priority ?? false}
              sizes={options.sizes}
              className="object-contain p-5 transition-transform duration-500 ease-out motion-reduce:transform-none motion-reduce:transition-none group-hover:scale-[1.035]"
            />
          ) : (
            <div className="flex h-full items-end p-5">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted">Palermo fragrance</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-[var(--container-wide)] py-8 sm:py-10 lg:py-12">
        <div className="max-w-[42rem]">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">Your consultation</p>
          <h1 className="mt-3 text-[clamp(2.5rem,5vw,4.75rem)] font-[300] leading-[0.98] tracking-[-0.055em] text-text">
            Your fragrance edit
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-text-muted sm:text-lg">
            A considered selection shaped by the preferences you shared.
          </p>
        </div>

        {!hasItems ? (
          <div className="mt-14 border-y border-border py-12 text-center">
            <p className="font-medium text-text">No matching fragrances were found.</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
              Try adjusting your preferences or explore our complete fragrance catalogue.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button variant="outline" onClick={handleReset}>
                Retake consultation
              </Button>
              <Link
                href="/catalogue"
                className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-text transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Browse catalogue
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-10 space-y-20 sm:mt-12 lg:space-y-28">
            {featured && (
              <article className="grid gap-8 md:grid-cols-2 md:items-start md:gap-x-10 lg:grid-cols-12 lg:gap-x-12 xl:gap-x-20">
                <Link
                  href={`/product/${featured.perfume.id}`}
                  className="group relative block aspect-[4/5] overflow-hidden bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 lg:col-span-7 lg:aspect-[6/5]"
                >
                  {productImage(featured, {
                    priority: true,
                    sizes: "(max-width: 1023px) calc(100vw - 2rem), (max-width: 1279px) 56vw, 45vw",
                  })}
                </Link>
                <div className="md:py-3 lg:col-span-5 lg:py-8">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">First to explore</p>
                  <p className="mt-8 text-sm font-medium text-text">{featured.perfume.primaryFamily.label}</p>
                  <h2 className="mt-3 max-w-md text-[clamp(2.5rem,4.5vw,4.5rem)] font-[300] leading-[0.98] tracking-[-0.055em] text-text">
                    {featured.perfume.name}
                  </h2>
                  <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-text-muted">
                    {featured.perfume.intensity && <span>{featured.perfume.intensity.label}</span>}
                    {featured.perfume.intensity && <span aria-hidden="true">·</span>}
                    <span>From <strong className="font-medium text-text">{formatMoney(featured.perfume.priceFrom)}</strong></span>
                  </div>
                  {!result.fallback && featured.reason.trim() && (
                    <p className="mt-8 max-w-sm border-l border-border-strong pl-4 text-sm leading-6 text-text-muted">{featured.reason}</p>
                  )}
                  <Link
                    href={`/product/${featured.perfume.id}`}
                    className="group mt-10 inline-flex min-h-[44px] items-center gap-3 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
                  >
                    View fragrance <span aria-hidden="true" className="text-lg transition-transform duration-200 motion-reduce:transform-none motion-reduce:transition-none group-hover:translate-x-1">→</span>
                  </Link>
                </div>
              </article>
            )}

            {remaining.length > 0 && (
              <section aria-labelledby="more-recommendations-heading">
                <div className="border-t border-border pt-8 sm:pt-10 lg:grid lg:grid-cols-12 lg:gap-x-12">
                  <div className="lg:col-span-4 lg:pt-3">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">The rest of your edit</p>
                    <h2 id="more-recommendations-heading" className="mt-3 text-[clamp(2rem,3.5vw,3.25rem)] font-[300] leading-[1.02] tracking-[-0.045em] text-text">Continue exploring</h2>
                    <p className="mt-5 max-w-[17rem] text-sm leading-6 text-text-muted">Each fragrance opens a different direction within your selection.</p>
                  </div>
                  <div className="mt-10 -mr-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 pr-4 sm:mr-0 sm:mt-0 sm:grid sm:grid-cols-3 sm:gap-x-6 sm:gap-y-14 sm:overflow-visible sm:p-0 lg:col-span-8 lg:gap-x-5 lg:gap-y-16">
                    {remaining.map(item => (
                    <article key={item.perfume.id} className="group w-[72%] shrink-0 snap-start sm:w-auto sm:shrink">
                      <Link
                        href={`/product/${item.perfume.id}`}
                        className="block aspect-[2/3] overflow-hidden bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
                      >
                        {productImage(item, {
                          sizes: "(max-width: 639px) 72vw, (max-width: 1023px) 29vw, (max-width: 1279px) 21vw, 18vw",
                        })}
                      </Link>
                      <div className="pt-4">
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">{item.perfume.primaryFamily.label}</p>
                        <h3 className="mt-2 text-lg font-[400] leading-tight tracking-[-0.025em] text-text sm:text-xl">{item.perfume.name}</h3>
                        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 text-sm leading-5 text-text-muted">
                          {item.perfume.intensity && <span>{item.perfume.intensity.label}</span>}
                          {item.perfume.intensity && <span aria-hidden="true">·</span>}
                          <span>From <strong className="font-medium text-text">{formatMoney(item.perfume.priceFrom)}</strong></span>
                        </div>
                        {!result.fallback && item.reason.trim() && (
                          <p className="mt-4 max-w-sm text-sm leading-6 text-text-muted">{item.reason}</p>
                        )}
                        <Link href={`/product/${item.perfume.id}`} className="group/link mt-3 inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4">
                          View <span aria-hidden="true" className="transition-transform duration-200 motion-reduce:transform-none motion-reduce:transition-none group-hover/link:translate-x-1">→</span>
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
                </div>
              </section>
            )}
          </div>
        )}

        {hasItems && <div className="mt-16 flex flex-col gap-3 border-t border-border pt-6 sm:mt-20 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" onClick={handleReset}>
            Retake consultation
          </Button>
          <Link
            href="/catalogue"
            className="inline-flex min-h-[44px] items-center text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Browse catalogue
          </Link>
        </div>}
      </div>
    );
  }

  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const currentSelections = currentQuestion ? answers[currentQuestion.id] ?? [] : [];

  return (
    <div className="mx-auto max-w-[var(--container-wide)] py-10 sm:py-14 lg:py-20">
      <div className="flex items-center justify-between border-b border-border pb-3 text-xs font-medium uppercase tracking-[0.16em] text-text-muted">
        <span>Fragrance consultation</span>
        <span className="tabular-nums">{String(currentQuestionIndex + 1).padStart(2, "0")} / {String(totalQuestions).padStart(2, "0")}</span>
      </div>
      <div className="h-px bg-border" aria-hidden="true">
        <div
          role="progressbar"
          aria-label="Questionnaire progress"
          aria-valuemin={1}
          aria-valuemax={totalQuestions}
          aria-valuenow={currentQuestionIndex + 1}
          className="h-px bg-primary transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {currentQuestion && (
        <section className="pt-10 sm:pt-14 lg:grid lg:grid-cols-12 lg:gap-x-16 xl:gap-x-24" aria-labelledby="consultation-question">
          <header className="lg:col-span-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">Question {currentQuestionIndex + 1}</p>
            <h1 id="consultation-question" className="mt-4 max-w-2xl text-[clamp(2.4rem,4.4vw,4.5rem)] font-[300] leading-[1.02] tracking-[-0.055em] text-text">
              {currentQuestion.prompt}
            </h1>
            <p className="mt-5 text-sm leading-6 text-text-muted sm:text-base">
              {currentQuestion.maxSelections === 1
                ? "Choose the direction that feels closest to you."
                : `Choose up to ${currentQuestion.maxSelections} directions that feel closest to you.`}
            </p>
          </header>

          <div className="mt-10 lg:col-span-5 lg:col-start-8 lg:mt-1">
            <fieldset disabled={isSubmitting}>
              <legend className="sr-only">{currentQuestion.prompt}</legend>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-text-muted">
                {currentQuestion.maxSelections === 1 ? "Choose one" : `Choose up to ${currentQuestion.maxSelections}`}
              </p>
              <div className="border-t border-border">
                {currentQuestion.options.map((option) => {
                  const isChecked = currentSelections.includes(option.id);
                  const inputType = currentQuestion.maxSelections === 1 ? "radio" : "checkbox";

                  return (
                    <label
                      key={option.id}
                      className={`group relative flex min-h-[60px] cursor-pointer items-center gap-4 border-b border-border px-1 py-3 transition-colors duration-200 motion-reduce:transition-none ${
                        isChecked ? "bg-surface-muted text-text" : "text-text-muted hover:bg-surface-muted/70"
                      } ${isSubmitting ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <input
                        type={inputType}
                        name={currentQuestion.id}
                        value={option.id}
                        checked={isChecked}
                        disabled={isSubmitting}
                        onChange={() => handleOptionToggle(currentQuestion.id, option.id, currentQuestion.maxSelections)}
                        className="peer sr-only"
                      />
                      <span className="min-w-0 flex-1 text-lg leading-6 transition-transform duration-200 motion-reduce:transition-none group-hover:translate-x-1 peer-focus-visible:translate-x-1">
                        {option.label}
                      </span>
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center border text-sm transition-colors duration-200 motion-reduce:transition-none peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 ${
                        isChecked ? "border-primary bg-primary text-primary-text" : "border-border-strong bg-transparent text-transparent"
                      } ${inputType === "radio" ? "rounded-full" : "rounded-none"}`} aria-hidden="true">
                        ✓
                      </span>
                      {isChecked && <span className="sr-only">Selected</span>}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {validationError && (
              <Alert variant="warning" className="mt-6" role="alert">
                <p className="text-sm">{validationError}</p>
              </Alert>
            )}

            {submitError && (
              <div className="mt-6 space-y-3">
                <Alert variant="danger" role="alert">
                  <p className="font-semibold">Submission Failed</p>
                  <p className="text-sm">{submitError}</p>
                </Alert>
                <Link href="/catalogue" className="inline-flex min-h-[44px] items-center text-sm font-medium text-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                  Return to catalogue
                </Link>
              </div>
            )}

            <nav className="mt-10 flex items-center justify-between border-t border-border pt-4" aria-label="Consultation navigation">
              <Button variant="link" onClick={handlePrev} disabled={currentQuestionIndex === 0 || isSubmitting} className="min-h-[44px] text-sm font-medium">
                <span aria-hidden="true">←</span> Previous
              </Button>

              {isLastQuestion ? (
                <Button onClick={() => void handleSubmit()} isLoading={isSubmitting} disabled={isSubmitting} size="lg">
                  Find my fragrance <span aria-hidden="true">→</span>
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={isSubmitting} size="lg">
                  Next <span aria-hidden="true">→</span>
                </Button>
              )}
            </nav>
          </div>
        </section>
      )}
    </div>
  );
}
