"use client";

import { apiFetch } from "@/lib/clientApi";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Route } from "next";

import { MeaningView } from "@/components/MeaningView";
import { SessionRecapPanel } from "@/components/wordbooks/SessionRecapPanel";
import { WordbookStudyTabs } from "@/components/wordbooks/WordbookStudyTabs";
import { useMeaningViewMode } from "@/components/wordbooks/useMeaningViewMode";

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
  const [sessionActions, setSessionActions] = useState(0);
  const { mode, setMode } = useMeaningViewMode();

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

  const halfCount = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    itemStates.forEach((s) => {
      if (s.status === "CORRECT") correct += 1;
      if (s.status === "WRONG") wrong += 1;
    });
    return Math.min(correct, wrong);
  }, [itemStates]);

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
      setSessionActions((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update.");
    }
  };

  const recommendation =
    studyState.wrongCount > studyState.correctCount
      ? {
          href: `/wordbooks/${wordbookId}/list-wrong` as Route,
          label: "오답 리스트 복습",
          eta: "5분",
          reason: "오답이 정답보다 많아 우선 복습이 필요합니다."
        }
      : halfCount > 0
        ? {
            href: `/wordbooks/${wordbookId}/list-half` as Route,
            label: "회복 리스트 점검",
            eta: "4분",
            reason: "반복 교차된 단어부터 안정화하면 효율이 좋습니다."
          }
        : {
            href: `/wordbooks/${wordbookId}/quiz-meaning` as Route,
            label: "의미 퀴즈 이어서",
            eta: "3분",
            reason: "현재 흐름을 퀴즈로 이어가면 회상 고정에 유리합니다."
          };

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Wordbook Memorize</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{title || "Wordbook"}</h1>
          <p className="mt-2 text-sm text-slate-600">
            체크 {studyState.studiedCount} / 정답 {studyState.correctCount} / 오답 {studyState.wrongCount}
          </p>
        </div>
        <WordbookStudyTabs wordbookId={wordbookId} active="memorize" />
      </header>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
        <div className="text-xs text-slate-600">의미 표시</div>
        <div className="inline-flex rounded-lg border border-slate-200 p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("compact")}
            className={mode === "compact" ? "rounded-md bg-slate-900 px-2 py-1 font-semibold text-white" : "rounded-md px-2 py-1 text-slate-700"}
          >
            간결
          </button>
          <button
            type="button"
            onClick={() => setMode("detailed")}
            className={mode === "detailed" ? "rounded-md bg-slate-900 px-2 py-1 font-semibold text-white" : "rounded-md px-2 py-1 text-slate-700"}
          >
            자세히
          </button>
        </div>
      </div>

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
                  <MeaningView value={item.meaning} mode={mode} className="mt-1 text-sm text-slate-700" />
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

      {sessionActions >= 5 ? (
        <SessionRecapPanel
          title="학습 흐름이 만들어졌습니다"
          summary={`이번 세션에서 ${sessionActions}회 체크했습니다. 지금 이어서 다음 단계로 가면 기억 고정률이 더 좋아집니다.`}
          suggestion={recommendation}
          secondaryHref={`/wordbooks/${wordbookId}/list-correct` as Route}
          secondaryLabel="정답 리스트 보기"
        />
      ) : null}
    </section>
  );
}
