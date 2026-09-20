"use client";

import * as React from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

    return (
      <div className="mx-auto max-w-4xl py-6 space-y-8">
        <div className="border-b border-border pb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Fragrance Recommendations
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Curated selections based on your responses.
          </p>
        </div>

        {result.fallback && (
          <Alert variant="warning" role="alert">
            <p className="font-semibold">Deterministic Fallback Result</p>
            <p className="text-sm">
              Deterministic recommendations based on the submitted quiz responses and approved catalogue attributes.
            </p>
          </Alert>
        )}

        {!hasItems ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center space-y-4">
            <p className="text-foreground font-medium">No matching fragrances were found.</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your preferences or explore our complete fragrance catalogue.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="outline" onClick={handleReset}>
                Retake Questionnaire
              </Button>
              <Link
                href="/catalogue"
                className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-surface shadow hover:bg-primary/90 transition-colors"
              >
                Return to Catalogue
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {items.map((item: RecommendationItem) => (
              <Card key={item.perfume.id} className="flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      {item.perfume.primaryFamily && (
                        <Badge variant="accent" className="mb-2">
                          {item.perfume.primaryFamily.label}
                        </Badge>
                      )}
                      <CardTitle className="text-xl font-bold text-foreground">
                        {item.perfume.name}
                      </CardTitle>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground">From</span>
                      <p className="text-lg font-bold text-foreground">
                        {formatMoney(item.perfume.priceFrom)}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="rounded-md bg-surface p-3 text-sm border border-border">
                    <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider block mb-1">
                      Match Notes:
                    </span>
                    <p className="text-foreground">{item.reason}</p>
                  </div>

                  {item.perfume.intensity && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Intensity: </span>
                      {item.perfume.intensity.label}
                    </p>
                  )}
                </CardContent>

                <CardFooter className="pt-2 border-t border-border">
                  <Link
                    href={`/product/${item.perfume.id}`}
                    className="inline-flex min-h-[44px] w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-surface shadow hover:bg-primary/90 transition-colors"
                  >
                    View Fragrance
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        <div className="flex justify-center gap-3 pt-4">
          <Button variant="outline" onClick={handleReset}>
            Retake Questionnaire
          </Button>
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

  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const currentSelections = currentQuestion ? answers[currentQuestion.id] ?? [] : [];

  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="mb-6 space-y-2">
        <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span>
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </span>
          <span>Version {quiz.version}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface border border-border overflow-hidden">
          <div
            role="progressbar"
            aria-label="Questionnaire progress"
            aria-valuemin={1}
            aria-valuemax={totalQuestions}
            aria-valuenow={currentQuestionIndex + 1}
            className="h-full bg-primary transition-all duration-300"
            style={{
              width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
            }}
          />
        </div>
      </div>

      {currentQuestion && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-foreground">
              {currentQuestion.prompt}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {currentQuestion.maxSelections === 1
                ? "Select one option."
                : `Select up to ${currentQuestion.maxSelections} option${
                    currentQuestion.maxSelections > 1 ? "s" : ""
                  }.`}
              {currentQuestion.required && " (Required)"}
            </p>
          </CardHeader>

          <CardContent className="space-y-3">
            <fieldset disabled={isSubmitting}>
              <legend className="sr-only">{currentQuestion.prompt}</legend>
              <div className="space-y-2">
                {currentQuestion.options.map((option) => {
                  const isChecked = currentSelections.includes(option.id);
                  const inputType = currentQuestion.maxSelections === 1 ? "radio" : "checkbox";

                  return (
                    <label
                      key={option.id}
                      className={`flex min-h-[48px] cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors ${
                        isChecked
                          ? "border-primary bg-primary/5 font-medium text-foreground"
                          : "border-border bg-surface text-muted-foreground hover:border-primary/50"
                      } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <span className="text-sm">{option.label}</span>
                      <input
                        type={inputType}
                        name={currentQuestion.id}
                        value={option.id}
                        checked={isChecked}
                        disabled={isSubmitting}
                        onChange={() =>
                          handleOptionToggle(
                            currentQuestion.id,
                            option.id,
                            currentQuestion.maxSelections
                          )
                        }
                        className="h-5 w-5 accent-primary"
                      />
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {validationError && (
              <Alert variant="warning" className="mt-4" role="alert">
                <p className="text-sm">{validationError}</p>
              </Alert>
            )}

            {submitError && (
              <div className="mt-4 space-y-3">
                <Alert variant="danger" role="alert">
                  <p className="font-semibold">Submission Failed</p>
                  <p className="text-sm">{submitError}</p>
                </Alert>
                <div className="text-center">
                  <Link
                    href="/catalogue"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
                  >
                    Return to Catalogue
                  </Link>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0 || isSubmitting}
            >
              Previous
            </Button>

            {isLastQuestion ? (
              <Button
                onClick={() => void handleSubmit()}
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Find My Fragrance
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={isSubmitting}>
                Next Question
              </Button>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
