"use client";

import { apiFetch } from "@/lib/clientApi";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MeaningView } from "@/components/MeaningView";

type Item = {
  id: number;
  term: string;
  meaning: string;
  pronunciation: string | null;
  example: string | null;
  exampleMeaning: string | null;
};

type ItemState = {
  itemId: number;
  status: "NEW" | "CORRECT" | "WRONG";
  streak: number;
};

type StudyState = {
  studiedCount: number;
  correctCount: number;
  wrongCount: number;
};

export function WordbookStudyClient({ wordbookId }: { wordbookId: number }) {
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [itemStates, setItemStates] = useState<Map<number, ItemState>>(new Map());
  const [studyState, setStudyState] = useState<StudyState>({
    studiedCount: 0,
    correctCount: 0,
    wrongCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/wordbooks/${wordbookId}/study`, { cache: "no-store" });
      const json = (await res.json()) as {
        error?: string;
        wordbook?: { title: string; items: Item[] };
        itemStates?: ItemState[];
        studyState?: StudyState;
      };
      if (!res.ok || !json.wordbook) throw new Error(json.error ?? "Failed to load study state.");
      setTitle(json.wordbook.title);
      setItems(json.wordbook.items ?? []);
      setItemStates(new Map((json.itemStates ?? []).map((s) => [s.itemId, s])));
      if (json.studyState) setStudyState(json.studyState);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load study state.");
    } finally {
      setLoading(false);
    }
  }, [wordbookId]);

  useEffect(() => {
    void load();
  }, [load]);

  const progressPercent = useMemo(() => {
    if (items.length === 0) return 0;
    return Math.round((studyState.correctCount / items.length) * 100);
  }, [items.length, studyState.correctCount]);

  const mark = async (itemId: number, result: "CORRECT" | "WRONG" | "RESET") => {
    try {
      const res = await apiFetch(`/api/wordbooks/${wordbookId}/study/items/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result })
      });
      const json = (await res.json()) as {
        error?: string;
        itemState?: ItemState | null;
        studyState?: StudyState;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to update.");
      setItemStates((prev) => {
        const next = new Map(prev);
        if (!json.itemState) {
          next.delete(itemId);
        } else {
          next.set(itemId, json.itemState);
        }
        return next;
      });
      if (json.studyState) setStudyState(json.studyState);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update.");
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Wordbook Memorize</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{title || "Wordbook"}</h1>
          <p className="mt-2 text-sm text-slate-600">
            체크 {studyState.studiedCount} / 정답 {studyState.correctCount} / 오답 {studyState.wrongCount}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link href={{ pathname: `/wordbooks/${wordbookId}/quiz-meaning` }} data-testid="study-start-quiz" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50">Quiz Meaning</Link>
          <Link href={{ pathname: `/wordbooks/${wordbookId}/quiz-word` }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50">Quiz Word</Link>
          <Link href={{ pathname: `/wordbooks/${wordbookId}/list-correct` }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50">List Correct</Link>
          <Link href={{ pathname: `/wordbooks/${wordbookId}/list-wrong` }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50">List Wrong</Link>
          <Link href={{ pathname: `/wordbooks/${wordbookId}/list-half` }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50">List Half</Link>
          <Link href={{ pathname: `/wordbooks/${wordbookId}` }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50">Back</Link>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-600">Loading...</p> : null}
      {error ? (
        <p
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          role="status"
          aria-live="polite"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-2">
        {items.map((item, idx) => {
          const state = itemStates.get(item.id);
          return (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.term}</p>
                  <MeaningView value={item.meaning} className="mt-1 text-sm text-slate-700" />
                  {item.example ? (
                    <p className="mt-1 text-xs text-slate-500">
                      e.g. {item.example}
                      {item.exampleMeaning ? ` - ${item.exampleMeaning}` : ""}
                    </p>
                  ) : null}
                  {state ? (
                    <p className="mt-1 text-xs text-slate-500">
                      status {state.status} / streak {state.streak}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    data-testid={idx === 0 ? "study-mark-correct-first" : undefined}
                    onClick={() => void mark(item.id, "CORRECT")}
                    className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    Correct
                  </button>
                  <button
                    type="button"
                    onClick={() => void mark(item.id, "WRONG")}
                    className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    Wrong
                  </button>
                  <button
                    type="button"
                    onClick={() => void mark(item.id, "RESET")}
                    className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
