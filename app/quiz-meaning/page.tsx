import { Suspense } from "react";
import { QuizClient } from "@/components/QuizClient";

export default function QuizMeaningPage() {
  return (
    <Suspense fallback={<div className="rounded-xl bg-white p-4">Loading...</div>}>
      <QuizClient quizType="MEANING" />
    </Suspense>
  );
}
