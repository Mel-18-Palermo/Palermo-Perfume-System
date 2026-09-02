import { CustomerShell } from "@/components/layout/customer-shell";
import { FragranceQuizView } from "@/modules/personalisation/fragrance-quiz-view";

export const metadata = {
  title: "Fragrance Finder Quiz | Palermo Parfums",
  description: "Discover your personalized signature scent through our bespoke fragrance advisor.",
};

export default function QuizPage() {
  return (
    <CustomerShell>
      <FragranceQuizView />
    </CustomerShell>
  );
}