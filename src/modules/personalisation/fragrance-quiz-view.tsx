"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import {
  fetchFragranceRecommendations,
  getDeterministicFallbackRecommendations,
  type RecommendationContractResult,
  type QuizAnswersPayload,
} from "./recommendation-service";

interface QuizOption {
  id: string;
  label: string;
  description: string;
}

interface QuizQuestion {
  id: string;
  title: string;
  subtitle: string;
  options: QuizOption[];
}

const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: "scentProfile",
    title: "What scent profile resonates most with you?",
    subtitle: "Select the olfactory universe that reflects your aesthetic.",
    options: [
      { id: "citrus", label: "Fresh & Citrus", description: "Bright bergamot, Sicilian lemon, sea salt, crisp minerals." },
      { id: "floral", label: "Floral & Romantic", description: "Damask rose, white neroli, orange blossom, jasmine." },
      { id: "woody", label: "Woody & Resinous", description: "Aged cedar, dark agarwood, earthy cypress, smoky vetiver." },
      { id: "oriental", label: "Warm & Amber", description: "Spiced tonka, bourbon vanilla, benzoin, rich amber." },
    ],
  },
  {
    id: "intensity",
    title: "How do you prefer your fragrance projection?",
    subtitle: "Determine your desired presence and sillage.",
    options: [
      { id: "intimate", label: "Intimate / Second Skin", description: "Subtle halo, personal aura noticeable within arm's reach." },
      { id: "balanced", label: "Balanced / Signature", description: "Noticeable, elegant presence for daily encounters." },
      { id: "bold", label: "Bold / Extrait Powerhouse", description: "Intense longevity and expansive sillage for lasting impression." },
    ],
  },
  {
    id: "occasion",
    title: "When will you wear this fragrance primarily?",
    subtitle: "Context shapes the ideal note progression.",
    options: [
      { id: "daily", label: "Daylight Elegance", description: "Office, casual outings, warm mornings, fresh air." },
      { id: "evening", label: "Nocturne & Soirée", description: "Dinners, formal events, nightlife, intimate settings." },
      { id: "all", label: "Universal Signature", description: "Versatile transition seamlessly from day to night." },
    ],
  },
] as const;

export function FragranceQuizView() {
  const [currentStep, setCurrentStep] = React.useState<number>(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [showResults, setShowResults] = React.useState<boolean>(false);
  const [recommendations, setRecommendations] = React.useState<RecommendationContractResult[]>([]);
  const [resultSource, setResultSource] = React.useState<"AI_LIVE_ADAPTER" | "DETERMINISTIC_FALLBACK">("AI_LIVE_ADAPTER");
  const [advisoryBanner, setAdvisoryBanner] = React.useState<string | null>(null);
  const [stepError, setStepError] = React.useState<string | null>(null);
  const [fatalError, setFatalError] = React.useState<string | null>(null);

  const fallbackQuestion: QuizQuestion = {
    id: "scentProfile",
    title: "Question",
    subtitle: "",
    options: [],
  };

  const question: QuizQuestion = QUIZ_QUESTIONS[currentStep] ?? fallbackQuestion;
  const selectedOption = answers[question.id] ?? null;

  const handleSelectOption = (optionId: string) => {
    setAnswers((prev) => ({ ...prev, [question.id]: optionId }));
    setStepError(null);
  };

  const handleNext = () => {
    if (!selectedOption) {
      setStepError("Please select an option to proceed.");
      return;
    }

    if (currentStep < QUIZ_QUESTIONS.length - 1) {
      setCurrentStep((prev) => prev + 1);
      setStepError(null);
    } else {
      void handleSubmit(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setStepError(null);
    }
  };

  const handleSubmit = async (forceSimulatedFailure: boolean = false) => {
    setIsSubmitting(true);
    setStepError(null);
    setFatalError(null);

    const payload: QuizAnswersPayload = {
      scentProfile: answers.scentProfile ?? "citrus",
      intensity: answers.intensity ?? "balanced",
      occasion: answers.occasion ?? "all",
    };

    try {
      const response = await fetchFragranceRecommendations(payload, forceSimulatedFailure);
      setRecommendations(response.recommendations);
      setResultSource(response.source);
      setAdvisoryBanner(null);
      setShowResults(true);
    } catch {
      const fallback = getDeterministicFallbackRecommendations(payload);
      setRecommendations(fallback.recommendations);
      setResultSource(fallback.source);
      setAdvisoryBanner(fallback.advisoryMessage ?? null);
      setShowResults(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateFatalError = () => {
    setFatalError("Recommendation service is unavailable. Please explore the collection directly.");
  };

  const handleReset = () => {
    setCurrentStep(0);
    setAnswers({});
    setShowResults(false);
    setRecommendations([]);
    setAdvisoryBanner(null);
    setStepError(null);
    setFatalError(null);
  };

  if (fatalError) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Alert variant="danger" className="mb-6">
          <p className="font-semibold text-base mb-1">Service Unavailable</p>
          <p className="text-sm">{fatalError}</p>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Explore All Formulations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Our bespoke fragrance catalogue is fully accessible while recommendation services are being updated.
            </p>
          </CardContent>
          <CardFooter className="flex gap-4">
            <Link href="/" className="w-full sm:w-auto">
              <Button className="w-full">Return to Catalogue</Button>
            </Link>
            <Button variant="outline" onClick={handleReset} className="w-full sm:w-auto">
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {advisoryBanner && (
          <Alert variant="warning" className="mb-6">
            <p className="font-semibold text-sm">Advisory Notification</p>
            <p className="text-sm">{advisoryBanner}</p>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="accent">Curated Matches</Badge>
              <Badge variant="neutral" className="text-[11px]">
                {resultSource === "AI_LIVE_ADAPTER" ? "AI Recommendation Active" : "Deterministic Fallback Active"}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Your Fragrance Signatures</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Product-grounded matches derived strictly from approved catalogue formulas.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={handleReset}>
              Retake Quiz
            </Button>
            <Link href="/">
              <Button size="sm">Explore Catalogue</Button>
            </Link>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {recommendations.map((rec) => (
            <Card key={rec.id} className="flex flex-col justify-between">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="neutral">{rec.concentration}</Badge>
                  <span className="text-xs font-semibold text-accent">{rec.matchScore}% Match</span>
                </div>
                <CardTitle className="text-2xl font-bold text-foreground">{rec.name}</CardTitle>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{rec.family}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{rec.description}</p>

                <div className="rounded-md bg-surface-muted p-3 text-xs">
                  <span className="font-semibold text-foreground">Recommendation Match Rationale: </span>
                  <span className="text-muted-foreground">{rec.reasoning}</span>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                    Key Dominant Notes
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {rec.dominantNotes.map((note) => (
                      <Badge key={note} variant="neutral" className="text-xs font-normal">
                        {note}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Ideal Occasion: </span>
                  {rec.suggestedOccasion}
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between border-t border-border pt-4">
                <span className="text-xl font-bold text-foreground">
                  ${rec.price.toFixed(2)} AUD
                </span>
                <Link href={`/?search=${encodeURIComponent(rec.name)}`}>
                  <Button size="sm">View Formulation</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium mb-2">
          <span>Question {currentStep + 1} of {QUIZ_QUESTIONS.length}</span>
          <span>{Math.round(((currentStep + 1) / QUIZ_QUESTIONS.length) * 100)}% Completed</span>
        </div>
        <div className="w-full h-2 bg-surface-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / QUIZ_QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      {stepError && (
        <Alert variant="danger" className="mb-6">
          <p className="text-sm">{stepError}</p>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">{question.title}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{question.subtitle}</p>
        </CardHeader>

        <CardContent className="space-y-3 pt-2">
          {question.options.map((option) => {
            const isSelected = selectedOption === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelectOption(option.id)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  isSelected
                    ? "border-accent bg-accent/5 ring-2 ring-accent text-foreground"
                    : "border-border hover:border-foreground/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="font-semibold text-base text-foreground">{option.label}</div>
                <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
              </button>
            );
          })}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || isSubmitting}
            className="w-full sm:w-auto"
          >
            Previous
          </Button>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleSubmit(true)}
              disabled={isSubmitting}
              className="text-xs text-muted-foreground hover:text-foreground"
              title="Test deterministic fallback when AI adapter fails"
            >
              Simulate AI Failure
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSimulateFatalError}
              className="text-xs text-muted-foreground hover:text-destructive"
              title="Test catalogue recovery state"
            >
              Simulate Outage
            </Button>
            <Button onClick={handleNext} disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting
                ? "Connecting Adapter..."
                : currentStep === QUIZ_QUESTIONS.length - 1
                ? "Generate Recommendations"
                : "Next"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}