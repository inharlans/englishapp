"use client";

import { apiFetch } from "@/lib/clientApi";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MeaningView } from "@/components/MeaningView";
import { MemorizeWordCard } from "@/components/MemorizeWordCard";
import { StudySourcePicker } from "@/components/StudySourcePicker";
import type { WordCardDto } from "@/components/types";
import { useStudySource } from "@/components/useStudySource";

type MemorizeResponse = {
  words: WordCardDto[];
  total: number;
  page: number;
  batch: number;
  maxWeek?: number;
};

type WordbookStudyItem = {
  id: number;
  term: string;
  meaning: string;
  example: string | null;
  exampleMeaning: string | null;
};

type WordbookItemState = {
  itemId: number;
  status: "NEW" | "CORRECT" | "WRONG";
  streak: number;
  everCorrect: boolean;
  everWrong: boolean;
  lastResult: "CORRECT" | "WRONG" | null;
};

type WordbookStudyResponse = {
  wordbook?: { title: string; items: WordbookStudyItem[] };
  itemStates?: WordbookItemState[];
  studyState?: { studiedCount: number; correctCount: number; wrongCount: number };
  error?: string;
};

const DEFAULT_BATCH = 4;

export default function MemorizePage() {
  const { source, setSource, downloaded, error: sourceError } = useStudySource();
  const [batch, setBatch] = useState(DEFAULT_BATCH);
  const [hideCorrect, setHideCorrect] = useState(false);
  const [week, setWeek] = useState(1);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<MemorizeResponse | null>(null);
  const [wordbookTitle, setWordbookTitle] = useState("");
  const [wordbookItems, setWordbookItems] = useState<WordbookStudyItem[]>([]);
  const [wordbookStates, setWordbookStates] = useState<Map<number, WordbookItemState>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageInput, setPageInput] = useState("1");

  const maxWeek = Math.max(data?.maxWeek ?? 1, 1);
  const isCore = source.kind === "core";

  const loadCore = async () => {
    const res = await apiFetch(
      `/api/words?mode=memorize&batch=${batch}&page=${page}&hideCorrect=${hideCorrect}&week=${week}`
    );
    const json = (await res.json()) as MemorizeResponse & { error?: string };
    if (!res.ok) throw new Error(json.error ?? "Failed to load words");
    setData(json);
  };

  const loadWordbook = async (wordbookId: number) => {
    const res = await apiFetch(`/api/wordbooks/${wordbookId}/study`, { cache: "no-store" });
    const json = (await res.json()) as WordbookStudyResponse;
    if (!res.ok || !json.wordbook) {
      throw new Error(json.error ?? "Failed to load wordbook study state.");
    }
    setWordbookTitle(json.wordbook.title);
    setWordbookItems(json.wordbook.items ?? []);
    setWordbookStates(new Map((json.itemStates ?? []).map((s) => [s.itemId, s])));
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (isCore) {
          await loadCore();
        } else {
          await loadWordbook(source.wordbookId);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load words");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [isCore, source, batch, page, hideCorrect, week]);

  useEffect(() => {
    setPage(0);
  }, [batch, hideCorrect, week, source.kind === "core" ? "core" : source.wordbookId]);

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  useEffect(() => {
    if (week > maxWeek) setWeek(maxWeek);
  }, [week, maxWeek]);

  const total = isCore ? data?.total ?? 0 : wordbookItems.length;
  const maxPage = Math.max(Math.ceil(total / batch) - 1, 0);
  const coreWords = data?.words ?? [];
  const wordbookPageItems = useMemo(
    () => wordbookItems.slice(page * batch, page * batch + batch),
    [batch, page, wordbookItems]
  );

  const visibleWordbookItems = useMemo(() => {
    if (!hideCorrect) return wordbookPageItems;
    return wordbookPageItems.filter((item) => wordbookStates.get(item.id)?.status !== "CORRECT");
  }, [hideCorrect, wordbookPageItems, wordbookStates]);

  const progressInDeck = useMemo(() => {
    if (total === 0) return 0;
    const viewed = Math.min((page + 1) * batch, total);
    return Math.min((viewed / total) * 100, 100);
  }, [batch, page, total]);

  const saveCoreMeaning = async (wordId: number, ko: string) => {
    const res = await apiFetch(`/api/words/${wordId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ko })
    });
    const json = (await res.json()) as { error?: string; word?: { id: number; ko: string } };
    if (!res.ok || !json.word) {
      throw new Error(json.error ?? "Failed to save meaning");
    }
    setData((prev) =>
      prev
        ? { ...prev, words: prev.words.map((w) => (w.id === wordId ? { ...w, ko: json.word!.ko } : w)) }
        : prev
    );
  };

  const markWordbookItem = async (itemId: number, result: "CORRECT" | "WRONG" | "RESET") => {
    if (source.kind !== "wordbook") return;
    const res = await apiFetch(`/api/wordbooks/${source.wordbookId}/study/items/${itemId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result })
    });
    const json = (await res.json()) as { error?: string; itemState?: WordbookItemState | null };
    if (!res.ok) throw new Error(json.error ?? "Failed to update.");
    setWordbookStates((prev) => {
      const next = new Map(prev);
      if (!json.itemState) {
        next.delete(itemId);
      } else {
        next.set(itemId, json.itemState);
      }
      return next;
    });
  };

  const jumpToPage = () => {
    const raw = Number(pageInput);
    const requested = Number.isFinite(raw) ? Math.floor(raw) : 1;
    const clamped = Math.min(Math.max(requested, 1), maxPage + 1);
    setPage(clamped - 1);
    setPageInput(String(clamped));
  };

  return (
    <section className="space-y-5">
      <header className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Memorize Track</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {isCore ? "Weekly Memory Deck" : `Wordbook Memory Deck · ${wordbookTitle || "Loading..."}`}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {isCore
                ? "기본 1500 단어를 주차별로 학습합니다."
                : "다운로드 단어장을 읽기 전용으로 학습합니다. 원본 데이터는 변경되지 않습니다."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/quiz-meaning" className="rounded-xl border border-teal-300 bg-teal-50 px-3.5 py-2 text-xs font-semibold text-teal-900 transition hover:bg-teal-100">
              Meaning Quiz
            </Link>
            <Link href="/quiz-word" className="rounded-xl border border-sky-300 bg-sky-50 px-3.5 py-2 text-xs font-semibold text-sky-900 transition hover:bg-sky-100">
              Word Quiz
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
          <StudySourcePicker source={source} downloaded={downloaded} onChange={setSource} />

          {isCore ? (
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="font-medium">Week</span>
              <select
                value={week}
                onChange={(e) => setWeek(Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                {Array.from({ length: maxWeek }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    week{w} ({(w - 1) * 50 + 1}-{w * 50})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div />
          )}

          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
            <span>Cards</span>
            <select
              value={batch}
              onChange={(e) => setBatch(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={hideCorrect}
              onChange={(e) => setHideCorrect(e.target.checked)}
              className="h-4 w-4 accent-teal-600"
            />
            Hide correct words
          </label>
        </div>

        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Loaded {isCore ? coreWords.length : visibleWordbookItems.length} / {total}
            </span>
            <span>{Math.round(progressInDeck)}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressInDeck}%` }}
            />
          </div>
        </div>
      </header>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: batch }, (_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white/70" />
          ))}
        </div>
      ) : isCore ? (
        <div className="grid gap-4 md:grid-cols-2">
          {coreWords.map((word) => (
            <MemorizeWordCard key={word.id} word={word} onSaveMeaning={saveCoreMeaning} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visibleWordbookItems.map((item) => {
            const state = wordbookStates.get(item.id);
            return (
              <article key={item.id} className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_16px_36px_-24px_rgba(15,23,42,0.6)]">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">{item.term}</h2>
                <div className="mt-3 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900">
                  <MeaningView value={item.meaning} className="text-sm text-slate-800" />
                </div>
                {item.example ? (
                  <p className="mt-2 text-xs text-slate-500">
                    e.g. {item.example}
                    {item.exampleMeaning ? ` - ${item.exampleMeaning}` : ""}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void markWordbookItem(item.id, "CORRECT")}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    Correct
                  </button>
                  <button
                    type="button"
                    onClick={() => void markWordbookItem(item.id, "WRONG")}
                    className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    Wrong
                  </button>
                  <button
                    type="button"
                    onClick={() => void markWordbookItem(item.id, "RESET")}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Reset
                  </button>
                </div>
                {state ? (
                  <p className="mt-2 text-xs text-slate-500">
                    status {state.status} · streak {state.streak}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">뜻 수정은 비활성화됩니다.</p>
              </article>
            );
          })}
        </div>
      )}

      {!loading && total === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          No words available for this source.
        </p>
      ) : null}

      {sourceError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{sourceError}</p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      <div className="sticky bottom-3 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-white/70 bg-white/90 p-3 shadow-[0_20px_38px_-26px_rgba(15,23,42,0.75)] backdrop-blur">
        <button
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
          disabled={page <= 0 || loading}
        >
          Prev
        </button>
        <button
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => setPage((prev) => Math.min(prev + 1, maxPage))}
          disabled={page >= maxPage || loading}
        >
          Next
        </button>
        <span className="text-sm text-slate-600">
          page {page + 1} / {maxPage + 1}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              jumpToPage();
            }}
            inputMode="numeric"
            className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            aria-label="Jump to page"
            disabled={loading}
          />
          <button
            type="button"
            onClick={jumpToPage}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Go
          </button>
        </div>
      </div>
    </section>
  );
}

