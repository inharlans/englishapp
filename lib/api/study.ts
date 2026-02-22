import { apiFetch } from "@/lib/clientApi";

import { parseApiResponse } from "@/lib/api/base";

export interface StudyItemState {
  status: "NEW" | "CORRECT" | "WRONG";
  everCorrect?: boolean;
  everWrong?: boolean;
  streak?: number;
}

export interface StudyItem {
  id: number;
  term: string;
  meaning: string;
  pronunciation?: string | null;
  example: string | null;
  exampleMeaning: string | null;
  itemState: StudyItemState | null;
}

export async function fetchWordbookStudy(input: {
  wordbookId: number;
  view: "memorize" | "listCorrect" | "listWrong" | "listHalf";
  page: number;
  take: number;
  q?: string;
  hideCorrect?: boolean;
  partSize?: number;
  partIndex?: number;
}): Promise<{
  wordbook?: { title: string; fromLang?: string };
  studyState?: { studiedCount: number; correctCount: number; wrongCount: number };
  items: StudyItem[];
  paging?: {
    page?: number;
    take?: number;
    totalFiltered?: number;
    totalItems?: number;
    partCount?: number;
    partStats?: Array<{ partIndex: number; totalInPart: number; matchedCount: number }>;
  };
}> {
  const qs = new URLSearchParams({
    view: input.view,
    page: String(input.page),
    take: String(input.take)
  });
  if (input.q !== undefined) qs.set("q", input.q);
  if (typeof input.hideCorrect === "boolean") qs.set("hideCorrect", input.hideCorrect ? "1" : "0");
  if (typeof input.partSize === "number") qs.set("partSize", String(input.partSize));
  if (typeof input.partIndex === "number") qs.set("partIndex", String(input.partIndex));

  const res = await apiFetch(`/api/wordbooks/${input.wordbookId}/study?${qs.toString()}`, { cache: "no-store" });
  const json = await parseApiResponse<{
    wordbook?: { title: string; fromLang?: string };
    studyState?: { studiedCount: number; correctCount: number; wrongCount: number };
    items?: StudyItem[];
    paging?: {
      page?: number;
      take?: number;
      totalFiltered?: number;
      totalItems?: number;
      partCount?: number;
      partStats?: Array<{ partIndex: number; totalInPart: number; matchedCount: number }>;
    };
  }>(res, "Failed to fetch study items.", "study.list");
  return {
    wordbook: json.wordbook,
    studyState: json.studyState,
    items: json.items ?? [],
    paging: json.paging
  };
}
