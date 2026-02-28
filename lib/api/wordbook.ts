import { apiFetch } from "@/lib/clientApi";

import { parseApiResponse } from "@/lib/api/base";

export async function updateWordbookMeta(input: {
  wordbookId: number;
  title: string;
  description: string | null;
  fromLang: string;
  toLang: string;
}): Promise<void> {
  const res = await apiFetch(`/api/wordbooks/${input.wordbookId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      fromLang: input.fromLang,
      toLang: input.toLang
    })
  });
  await parseApiResponse<{ wordbook?: unknown }>(res, "Failed to update wordbook.", "wordbook.updateMeta");
}

export async function updateWordbookItem(input: {
  wordbookId: number;
  itemId: number;
  term: string;
  meaning: string;
  pronunciation: string | null;
  example: string | null;
  exampleMeaning: string | null;
}): Promise<void> {
  const res = await apiFetch(`/api/wordbooks/${input.wordbookId}/items/${input.itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      term: input.term,
      meaning: input.meaning,
      pronunciation: input.pronunciation,
      example: input.example,
      exampleMeaning: input.exampleMeaning
    })
  });
  await parseApiResponse<{ item?: unknown }>(res, "Failed to update item.", "wordbook.items.update");
}

export async function deleteWordbookItem(input: { wordbookId: number; itemId: number }): Promise<void> {
  const res = await apiFetch(`/api/wordbooks/${input.wordbookId}/items/${input.itemId}`, { method: "DELETE" });
  await parseApiResponse<{ ok?: boolean }>(res, "Failed to delete item.", "wordbook.items.delete");
}

export async function createWordbook(input: {
  title: string;
  description: string | null;
  fromLang: string;
  toLang: string;
}): Promise<{ id: number }> {
  const res = await apiFetch("/api/wordbooks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const json = await parseApiResponse<{ wordbook?: { id: number } }>(res, "Failed to create wordbook.", "wordbook.create");
  if (!json.wordbook?.id) throw new Error("Failed to create wordbook.");
  return { id: json.wordbook.id };
}

export async function saveWordbookItems(input: {
  wordbookId: number;
  items: Array<{ position: number; term: string; meaning: string }>;
}): Promise<void> {
  const res = await apiFetch(`/api/wordbooks/${input.wordbookId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: input.items })
  });
  await parseApiResponse<{ ok?: boolean }>(res, "Failed to save wordbook items.", "wordbook.items.save");
}

export async function addWordbookItems(input: {
  wordbookId: number;
  items: Array<{
    term: string;
    meaning: string;
    pronunciation?: string | null;
    example?: string | null;
    exampleMeaning?: string | null;
    position?: number;
  }>;
}): Promise<void> {
  const res = await apiFetch(`/api/wordbooks/${input.wordbookId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: input.items })
  });
  await parseApiResponse<{ ok?: boolean }>(res, "Failed to save wordbook items.", "wordbook.items.add");
}

export async function deleteWordbook(wordbookId: number): Promise<void> {
  const res = await apiFetch(`/api/wordbooks/${wordbookId}`, { method: "DELETE" });
  await parseApiResponse<{ ok?: boolean }>(res, "Failed to delete wordbook.", "wordbook.delete");
}

export async function blockWordbookOwner(wordbookId: number): Promise<void> {
  const res = await apiFetch(`/api/wordbooks/${wordbookId}/block`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  await parseApiResponse<{ ok?: boolean }>(res, "Failed to block owner.", "wordbook.blockOwner");
}

export async function downloadWordbook(input: {
  wordbookId: number;
}): Promise<{ wordbookTitle?: string | null }> {
  const res = await apiFetch(`/api/wordbooks/${input.wordbookId}/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  const json = await parseApiResponse<{ wordbookTitle?: string | null }>(
    res,
    "Failed to download wordbook.",
    "wordbook.download"
  );
  return { wordbookTitle: json.wordbookTitle ?? null };
}

export interface WordbookReview {
  id: number;
  rating: number;
  review: string | null;
  updatedAt: string;
  userEmail: string;
}

export async function fetchWordbookReviews(input: {
  wordbookId: number;
  take?: number;
}): Promise<{ reviews: WordbookReview[] }> {
  const take = input.take ?? 20;
  const res = await apiFetch(`/api/wordbooks/${input.wordbookId}/reviews?take=${take}`, { cache: "no-store" });
  const json = await parseApiResponse<{ reviews?: WordbookReview[] }>(res, "Failed to load reviews.", "wordbook.reviews");
  return { reviews: json.reviews ?? [] };
}

export interface WordbookDetail {
  id: number;
  title: string;
  description: string | null;
  fromLang: string;
  toLang: string;
  owner?: { email: string };
  items: Array<{ term: string; meaning: string; pronunciation: string | null }>;
}

export async function fetchWordbookDetail(wordbookId: number): Promise<WordbookDetail> {
  const res = await apiFetch(`/api/wordbooks/${wordbookId}`, { method: "GET" });
  const json = await parseApiResponse<{ wordbook?: WordbookDetail }>(res, "Failed to load wordbook.", "wordbook.detail");
  if (!json.wordbook) throw new Error("Invalid wordbook response.");
  return json.wordbook;
}

export async function setWordbookPublic(input: {
  wordbookId: number;
  isPublic: boolean;
}): Promise<void> {
  const res = await apiFetch(`/api/wordbooks/${input.wordbookId}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isPublic: input.isPublic })
  });
  await parseApiResponse<{ wordbook?: { id: number; isPublic: boolean } }>(
    res,
    "Failed to update visibility.",
    "wordbook.publish"
  );
}

export async function rateWordbook(input: {
  wordbookId: number;
  rating: number;
  review: string | null;
}): Promise<void> {
  const res = await apiFetch(`/api/wordbooks/${input.wordbookId}/rate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating: input.rating, review: input.review })
  });
  await parseApiResponse<{ ok?: boolean }>(res, "Failed to save rating.", "wordbook.rate");
}

export async function reportWordbook(input: {
  wordbookId: number;
  reason: string;
  detail: string | null;
}): Promise<void> {
  const res = await apiFetch(`/api/wordbooks/${input.wordbookId}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: input.reason, detail: input.detail })
  });
  await parseApiResponse<{ ok?: boolean }>(res, "Failed to report wordbook.", "wordbook.report");
}

export async function syncDownloadedWordbook(input: {
  wordbookId: number;
  preserveStudyState: boolean;
}): Promise<{ addedCount: number; updatedCount: number; deletedCount: number }> {
  const res = await apiFetch(`/api/wordbooks/${input.wordbookId}/sync-download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preserveStudyState: input.preserveStudyState })
  });
  const json = await parseApiResponse<{
    summary?: { addedCount?: number; updatedCount?: number; deletedCount?: number };
  }>(res, "Failed to sync downloaded wordbook.", "wordbook.syncDownload");
  return {
    addedCount: json.summary?.addedCount ?? 0,
    updatedCount: json.summary?.updatedCount ?? 0,
    deletedCount: json.summary?.deletedCount ?? 0
  };
}

export async function importWordbookItems(input: {
  wordbookId: number;
  rawText: string;
  format: "tsv" | "csv";
  fillPronunciation: boolean;
  replaceAll: boolean;
}): Promise<{ importedCount: number }> {
  const res = await apiFetch(`/api/wordbooks/${input.wordbookId}/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rawText: input.rawText,
      format: input.format,
      fillPronunciation: input.fillPronunciation,
      replaceAll: input.replaceAll
    })
  });
  const json = await parseApiResponse<{ importedCount?: number }>(
    res,
    "Failed to import wordbook items.",
    "wordbook.import"
  );
  return { importedCount: json.importedCount ?? 0 };
}
