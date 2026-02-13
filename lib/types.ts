export type QuizType = "MEANING" | "WORD";

export type ApiMode =
  | "memorize"
  | "quiz"
  | "listCorrect"
  | "listWrong"
  | "listHalf";

export type ScopeType = "half";

export type WordPair = {
  en: string;
  ko: string;
};
