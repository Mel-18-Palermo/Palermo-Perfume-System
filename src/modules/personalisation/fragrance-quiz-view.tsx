"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

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

interface FragranceRecommendation {
  id: string;
  name: string;
  concentration: string;
  family: string;
  matchScore: number;
  description: string;
  dominantNotes: string[];
  suggestedOccasion: string;
  price: number;
}

const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: "scent_profile",
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

const MOCK_RECOMMENDATIONS: Record<string, FragranceRecommendation[]> = {
  citrus: [
    {
      id: "rec_1",
      name: "Santorini Mist",
      concentration: "Extrait de Parfum",
      family: "Citrus Mineral",
      matchScore: 98,
      description: "Sun-drenched Calabrian bergamot infused with marine salt and crisp sea spray notes.",
      dominantNotes: ["Calabrian Bergamot", "Sicilian Lemon", "Marine Salt"],
      suggestedOccasion: "Daylight Elegance & Summer Days",
      price: 120.0,
    },
    {
      id: "rec_2",
      name: "Neroli Blanc",
      concentration: "Eau de Parfum",
      family: "Citrus Floral",
      matchScore: 92,
      description: "Crisp white neroli petals anchored by sweet orange blossom and sparkling white musk.",
      dominantNotes: ["Tunisian Neroli", "Sweet Orange", "White Musk"],
      suggestedOccasion: "Universal Signature",
      price: 115.0,
    },
  ],
  floral: [
    {
      id: "rec_3",
      name: "Velvet Damask",
      concentration: "Extrait de Parfum",
      family: "Floral Oriental",
      matchScore: 96,
      description: "Opulent Turkish damask rose kissed with pink peppercorn and velvety jasmine sambac.",
      dominantNotes: ["Damask Rose", "Pink Pepper", "Jasmine Sambac"],
      suggestedOccasion: "Evening & Formal Events",
      price: 145.0,
    },
  ],
  woody: [
    {
      id: "rec_4",
      name: "Oud Royale",
      concentration: "Extrait de Parfum",
      family: "Woody Oriental",
      matchScore: 99,
      description: "Precious dark agarwood layered with smoked Atlas cedar and rich golden amber resin.",
      dominantNotes: ["Smoky Agarwood", "Atlas Cedar", "Golden Amber"],
      suggestedOccasion: "Nocturne & Evening Gala",
      price: 180.0,
    },
    {
      id: "rec_5",
      name: "Cypress Noir",
      concentration: "Eau de Parfum",
      family: "Woody Aromatic",
      matchScore: 89,
      description: "Aromatic Mediterranean cypress needle blended with Haitian vetiver and dark pine resin.",
      dominantNotes: ["Cypress Needle", "Haitian Vetiver", "Smoked Pine"],
      suggestedOccasion: "All-Day Signature",
      price: 150.0,
    },
  ],
  oriental: [
    {
      id: "rec_6",
      name: "Ambre Nuit",
      concentration: "Extrait de Parfum",
      family: "Warm Amber",
      matchScore: 97,
      description: "Lush Bourbon vanilla and Tonka bean laced with warm benzoin resin and golden honey.",
      dominantNotes: ["Bourbon Vanilla", "Tonka Bean", "Benzoin Resin"],
      suggestedOccasion: "Evening & Intimate Nights",
      price: 160.0,
    },
  ],
};

const DEFAULT_RECOMMENDATIONS: FragranceRecommendation[] = MOCK_RECOMMENDATIONS.citrus ?? [];

export function FragranceQuizView() {
  const [currentStep, setCurrentStep] = React.useState<number>(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [showResults, setShowResults] = React.useState<boolean>(false);
  const [recommendations, setRecommendations] = React.useState<FragranceRecommendation[]>([]);
  const [fallbackTriggered, setFallbackTriggered] = React.useState<boolean>(false);
  const [stepError, setStepError] = React.useState<string | null>(null);

  const fallbackQuestion: QuizQuestion = {
    id: "unknown",
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
      void handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setStepError(null);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setStepError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const selectedFamily = answers.scent_profile ?? "citrus";
      const matched = MOCK_RECOMMENDATIONS[selectedFamily] ?? DEFAULT_RECOMMENDATIONS;

      setRecommendations(matched);
      setShowResults(true);
    } catch {
      setFallbackTriggered(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setAnswers({});
    setShowResults(false);
    setRecommendations([]);
    setFallbackTriggered(false);
    setStepError(null);
  };

  const handleTriggerSimulatedFallback = () => {
    setFallbackTriggered(true);
  };

  if (fallbackTriggered) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Alert variant="info" className="mb-6">
          <p className="font-semibold">AI Recommendation Service Advisory</p>
          <p className="text-sm">
            The personalized formulation advisor is temporarily undergoing refinement. Our complete bespoke catalogue remains accessible.
          </p>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Explore All Formulations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You can browse our complete fragrance catalogue and filter by olfactory family, bottle size, and concentration directly.
            </p>
          </CardContent>
          <CardFooter className="flex gap-4">
            <Link href="/" className="w-full sm:w-auto">
              <Button className="w-full">Return to Catalogue</Button>
            </Link>
            <Button variant="outline" onClick={handleReset} className="w-full sm:w-auto">
              Retry Quiz
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <Badge variant="accent" className="mb-2">
              Curated Matches
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Your Fragrance Signatures</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Bespoke selections based on your olfactory profile and intensity preferences.
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

                <div className="rounded-md bg-surface-muted p-3 text-xs">
                  <span className="font-semibold text-foreground">Ideal Occasion: </span>
                  <span className="text-muted-foreground">{rec.suggestedOccasion}</span>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between border-t border-border pt-4">
                <span className="text-xl font-bold text-foreground">
                  ${rec.price.toFixed(2)} AUD
                </span>
                <Link href="/">
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

        <CardFooter className="flex items-center justify-between border-t border-border pt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || isSubmitting}
          >
            Previous
          </Button>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTriggerSimulatedFallback}
              className="text-xs text-muted-foreground hover:text-foreground"
              title="Test the advisory fallback error state"
            >
              Simulate Advisory State
            </Button>
            <Button onClick={handleNext} disabled={isSubmitting}>
              {isSubmitting
                ? "Formulating Matches..."
                : currentStep === QUIZ_QUESTIONS.length - 1
                ? "Discover Matches"
                : "Next"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}