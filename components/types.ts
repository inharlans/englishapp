export type ProgressDto = {
  correctStreak: number;
  nextReviewAt: string | null;
  wrongActive: boolean;
  wrongRecoveryRemaining: number;
};

export type ResultStateDto = {
  everCorrect: boolean;
  everWrong: boolean;
  lastResult: "CORRECT" | "WRONG" | null;
  updatedAt: string;
};

export type WordCardDto = {
  id: number;
  en: string;
  ko: string;
  progress: ProgressDto | null;
  resultState: ResultStateDto | null;
};
