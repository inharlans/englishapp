export type QuizMode = "MEANING" | "WORD";

export interface QuizActor {
  id: number;
  email: string;
  isAdmin: boolean;
  plan: "FREE" | "PRO";
  proUntil: Date | null;
  dailyGoal: number;
}

export interface QuizItemRow {
  id: number;
  term: string;
  meaning: string;
  example: string | null;
  exampleMeaning: string | null;
}

export interface QuizQueryInput {
  mode: QuizMode;
  partSize: number;
  partIndex: number;
}

export interface QuizQueryResponse {
  item: QuizItemRow | null;
  mode: QuizMode;
  totalItems: number;
  partSize: number;
  partIndex: number;
  partCount: number;
  partItemCount: number;
}

export interface QuizSubmitInput {
  itemId: number;
  mode: QuizMode;
  answer: string;
}

export interface GradingDiagnosis {
  input: string;
  normalizedInput: string;
  closestAccepted: string;
  similarityScore: number;
  potentiallyDisputable: boolean;
  reason: string;
}

export interface QuizSubmitResponse {
  correct: boolean;
  correctAnswer: { term: string; meaning: string };
  acceptedMeaningAnswers?: string[];
  gradingDiagnosis: GradingDiagnosis;
}

export interface LegacyQuizSubmitInput {
  wordId: number;
  quizType: QuizMode;
  userAnswer: string;
  scope?: "half";
}
