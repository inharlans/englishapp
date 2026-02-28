import { apiFetch } from "@/lib/clientApi";

import { parseApiResponse } from "@/lib/api/base";

export type QuizMode = "MEANING" | "WORD";

export type QuizItem = {
  id: number;
  term: string;
  meaning: string;
  example: string | null;
  exampleMeaning: string | null;
};

export async function fetchWordbookQuizQuestion(input: {
  wordbookId: number;
  mode: QuizMode;
  partSize: number;
  partIndex: number;
}): Promise<{
  item: QuizItem | null;
  totalItems: number;
  partItemCount: number;
}> {
  const qs = new URLSearchParams({
    mode: input.mode,
    partSize: String(input.partSize),
    partIndex: String(input.partIndex)
  });
  const res = await apiFetch(`/api/wordbooks/${input.wordbookId}/quiz?${qs.toString()}`, { cache: "no-store" });
  const json = await parseApiResponse<{
    item?: QuizItem | null;
    totalItems?: number;
    partItemCount?: number;
  }>(res, "Failed to fetch quiz question.", "quiz.question");
  return {
    item: json.item ?? null,
    totalItems: json.totalItems ?? 0,
    partItemCount: json.partItemCount ?? 0
  };
}

export async function submitWordbookQuizAnswer(input: {
  wordbookId: number;
  itemId: number;
  mode: QuizMode;
  answer: string;
}): Promise<{
  correct: boolean;
  correctAnswer?: { term: string; meaning: string };
  acceptedMeaningAnswers?: string[];
  gradingDiagnosis?: {
    input: string;
    normalizedInput: string;
    closestAccepted: string;
    similarityScore: number;
    potentiallyDisputable: boolean;
    reason: string;
  };
}> {
  const res = await apiFetch(`/api/wordbooks/${input.wordbookId}/quiz/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      itemId: input.itemId,
      mode: input.mode,
      answer: input.answer
    })
  });
  const json = await parseApiResponse<{
    correct?: boolean;
    correctAnswer?: { term: string; meaning: string };
    acceptedMeaningAnswers?: string[];
    gradingDiagnosis?: {
      input: string;
      normalizedInput: string;
      closestAccepted: string;
      similarityScore: number;
      potentiallyDisputable: boolean;
      reason: string;
    };
  }>(res, "Failed to submit quiz answer.", "quiz.submit");
  return {
    correct: Boolean(json.correct),
    correctAnswer: json.correctAnswer,
    acceptedMeaningAnswers: json.acceptedMeaningAnswers,
    gradingDiagnosis: json.gradingDiagnosis
  };
}
