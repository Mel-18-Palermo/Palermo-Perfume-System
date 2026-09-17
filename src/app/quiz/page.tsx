import type { Metadata } from "next";
import { FragranceQuizView } from "@/modules/personalisation/fragrance-quiz-view";

export const metadata: Metadata = {
  title: "Fragrance Finder Quiz | Palermo Perfumes",
  description:
    "Discover your signature fragrance through our guided olfactory profiling questionnaire.",
};

export default function QuizPage() {
  return (
    <main className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <FragranceQuizView />
    </main>
  );
}
