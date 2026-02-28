import { LastResult } from "@prisma/client";

export type WordStateRow = {
  id: number;
  en: string;
  ko: string;
};

export type WordWithState = {
  id: number;
  en: string;
  ko: string;
  memorizeWeek?: number;
  memorizePosition?: number;
  progress: {
    correctStreak: number;
    nextReviewAt: Date | null;
    wrongActive: boolean;
    wrongRecoveryRemaining: number;
  } | null;
  resultState: {
    everCorrect: boolean;
    everWrong: boolean;
    lastResult: LastResult | null;
    updatedAt: Date;
  } | null;
};

export type WordsScope = "half" | null;
