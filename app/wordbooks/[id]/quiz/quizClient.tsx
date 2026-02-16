"use client";

import { apiFetch } from "@/lib/clientApi";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Route } from "next";

import { MeaningView } from "@/components/MeaningView";
import { SessionRecapPanel } from "@/components/wordbooks/SessionRecapPanel";
import { WordbookStudyTabs } from "@/components/wordbooks/WordbookStudyTabs";
import { useMeaningViewMode } from "@/components/wordbooks/useMeaningViewMode";
import { useWordbookParting } from "@/components/wordbooks/useWordbookParting";
import { DensityModeToggle } from "@/components/ui/DensityModeToggle";
import { useDensityMode } from "@/components/ui/useDensityMode";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";

type QuizItem = {
  id: number;
  term: string;
  meaning: string;
  example: string | null;
  exampleMeaning: string | null;
};

type QuizMode = "MEANING" | "WORD";

type Props = {
  wordbookId: number;
  initialMode?: QuizMode;
  lockMode?: boolean;
};

type LoadPayload = {
  item?: QuizItem | null;
  error?: string;
  totalItems?: number;
  partItemCount?: number;
};

export function WordbookQuizClient({ wordbookId, initialMode = "MEANING", lockMode = false }: Props) {
  const [mode, setMode] = useState<QuizMode>(initialMode);
  const [item, setItem] = useState<QuizItem | null>(null);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [corrects, setCorrects] = useState(0);
  const [wrongs, setWrongs] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [partItemCount, setPartItemCount] = useState(0);
  const { mode: meaningMode, setMode: setMeaningMode } = useMeaningViewMode();
  const { mode: densityMode, setMode: setDensityMode } = useDensityMode();
  const { partSize, setPartSize, partIndex, setPartIndex, partCount } = useWordbookParting(wordbookId, totalItems);

  const loadNext = useCallback(async () => {
    setLoading(true);
    setMessage("");
    setAnswer("");
    try {
      const qs = new URLSearchParams({
        mode,
        partSize: String(partSize),
        partIndex: String(partIndex)
      });
      const res = await apiFetch(`/api/wordbooks/${wordbookId}/quiz?${qs.toString()}`, {
        cache: "no-store"
      });
      const json = (await res.json()) as LoadPayload;
      if (!res.ok) throw new Error(json.error ?? "Failed to load question.");
      setItem(json.item ?? null);
      setTotalItems(json.totalItems ?? 0);
      setPartItemCount(json.partItemCount ?? 0);
    } catch (e) {
      setItem(null);
      setMessage(e instanceof Error ? e.message : "Failed to load question.");
    } finally {
      setLoading(false);
    }
  }, [mode, partIndex, partSize, wordbookId]);

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !answer.trim()) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await apiFetch(`/api/wordbooks/${wordbookId}/quiz/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, mode, answer: answer.trim() })
      });
      const json = (await res.json()) as {
        correct?: boolean;
        correctAnswer?: { term: string; meaning: string };
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Submit failed.");
      setAttempts((v) => v + 1);
      if (json.correct) setCorrects((v) => v + 1);
      else setWrongs((v) => v + 1);
      setMessage(
        json.correct
          ? "?뺣떟?낅땲??"
          : `?ㅻ떟?낅땲?? ?뺣떟: ${json.correctAnswer?.term ?? ""} / ${json.correctAnswer?.meaning ?? ""}`
      );
      await loadNext();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Submit failed.");
    } finally {
      setLoading(false);
    }
  };

  const activeTab = mode === "MEANING" ? "quiz-meaning" : "quiz-word";
  const recommendation =
    wrongs > corrects
      ? {
          href: `/wordbooks/${wordbookId}/list-wrong` as Route,
          label: "Review wrong list",
          eta: "4m",
          reason: "Wrong answers are higher, so fix weak words first."
        }
      : {
          href: `/wordbooks/${wordbookId}/memorize` as Route,
          label: "Memorize check",
          eta: "3m",
          reason: "A quick memorize pass right after quiz improves retention."
        };

  const partButtons = useMemo(() => Array.from({ length: partCount }, (_, idx) => idx + 1), [partCount]);

  return (
    <section className="space-y-4">
      <header className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Wordbook Quiz</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {mode === "MEANING" ? "?섎? ?댁쫰" : "?⑥뼱 ?댁쫰"}
          </h1>
        </div>
        <WordbookStudyTabs wordbookId={wordbookId} active={activeTab} />
      </header>

      <div className="ui-card p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-600">?덉궗/?섎? ?쒖떆</div>
          {!lockMode ? (
            <label className="text-xs font-semibold text-slate-700">
              Mode{" "}
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value === "WORD" ? "WORD" : "MEANING")}
                data-testid="wordbook-quiz-mode"
                className="ml-2 rounded border border-slate-300 bg-white px-2 py-1"
              >
                <option value="MEANING">Meaning Quiz</option>
                <option value="WORD">Word Quiz</option>
              </select>
            </label>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 p-1 text-xs">
            <button
              type="button"
              onClick={() => setMeaningMode("compact")}
              className={
                meaningMode === "compact"
                  ? "rounded-md ui-tab-active px-2 py-1 font-semibold"
                  : "rounded-md ui-tab-inactive px-2 py-1"
              }
            >
              媛꾧껐
            </button>
            <button
              type="button"
              onClick={() => setMeaningMode("detailed")}
              className={
                meaningMode === "detailed"
                  ? "rounded-md ui-tab-active px-2 py-1 font-semibold"
                  : "rounded-md ui-tab-inactive px-2 py-1"
              }
            >
              ?먯꽭??            </button>
          </div>
          <DensityModeToggle mode={densityMode} onChange={setDensityMode} />
        </div>
      </div>

      <div className="ui-card p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="font-semibold text-slate-700">Part ?ш린(n)</label>
          <input
            type="number"
            min={1}
            max={200}
            value={partSize}
            onChange={(e) => setPartSize(Number(e.target.value))}
            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          />
          <span className="text-slate-500">
            珥?{totalItems}媛?쨌 {partCount}媛?part
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {partButtons.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPartIndex(n)}
              className={[
                "rounded-lg border px-3 py-1 text-xs font-semibold",
                n === partIndex
                  ? "ui-tab-active"
                  : "ui-tab-inactive"
              ].join(" ")}
            >
              Part {n}
            </button>
          ))}
        </div>
      </div>

      <div
        className={
          densityMode === "compact" ? "ui-card p-3" : densityMode === "focus" ? "ui-card p-6" : "ui-card p-5"
        }
      >
        {!item ? (
          loading ? (
            <p className="text-sm text-slate-600">Loading...</p>
          ) : (
            <EmptyStateCard
              title="異쒖젣 媛?ν븳 臾몄젣媛 ?놁뒿?덈떎"
              description={`Part ${partIndex} (${partItemCount}媛??먯꽌 癒쇱? ?숈뒿 ?곹깭瑜?留뚮뱾嫄곕굹 ?ㅻⅨ part瑜??좏깮?대낫?몄슂.`}
              primary={{ label: "?⑥뼱???곸꽭濡??대룞", href: `/wordbooks/${wordbookId}` }}
              secondary={{ label: "?붽린 ?쒖옉", href: `/wordbooks/${wordbookId}/memorize` }}
            />
          )
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Question</p>
            <p className="mt-1 text-xs text-slate-500">
              Part {partIndex} 쨌 {partItemCount} words
            </p>
            <div className="mt-2 text-3xl font-black tracking-tight text-slate-900">
              {mode === "MEANING" ? item.term : <MeaningView value={item.meaning} mode={meaningMode} />}
            </div>
            {item.example ? (
              <p className="mt-2 text-sm text-slate-500">
                e.g. {item.example}
                {item.exampleMeaning ? ` - ${item.exampleMeaning}` : ""}
              </p>
            ) : null}
            <form onSubmit={onSubmit} className="mt-4 flex flex-wrap gap-2">
              <label htmlFor="wordbook-quiz-answer" className="sr-only">
                Answer
              </label>
              <input
                id="wordbook-quiz-answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                data-testid="wordbook-quiz-answer"
                aria-label="Answer"
                placeholder={mode === "MEANING" ? "meaning" : "word"}
                className="min-w-[240px] flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                data-testid="wordbook-quiz-submit"
                disabled={loading}
                className="ui-btn-accent px-4 py-2 text-sm disabled:opacity-60"
              >
                Submit
              </button>
            </form>
          </>
        )}
      </div>

      {message ? (
        <p className="text-sm text-slate-700" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}

      {attempts >= 5 ? (
        <SessionRecapPanel
          title="?댁쫰 ?몄뀡 ?붿빟"
          summary={`珥?${attempts}臾몄젣 쨌 ?뺣떟 ${corrects} 쨌 ?ㅻ떟 ${wrongs}. 吏湲?諛붾줈 ?ㅼ쓬 ?④퀎濡??댁뼱媛硫??숈뒿 猷⑦봽媛 ?딄린吏 ?딆뒿?덈떎.`}
          suggestion={recommendation}
          secondaryHref={`/wordbooks/${wordbookId}/list-half` as Route}
          secondaryLabel="?뚮났 紐⑸줉 蹂닿린"
        />
      ) : null}
    </section>
  );
}
