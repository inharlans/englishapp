"use client";

import { apiFetch } from "@/lib/clientApi";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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

export function WordbookQuizClient({ wordbookId, initialMode = "MEANING", lockMode = false }: Props) {
  const [mode, setMode] = useState<QuizMode>(initialMode);
  const [item, setItem] = useState<QuizItem | null>(null);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadNext = useCallback(async () => {
    setLoading(true);
    setMessage("");
    setAnswer("");
    try {
      const res = await apiFetch(`/api/wordbooks/${wordbookId}/quiz?mode=${mode}`, { cache: "no-store" });
      const json = (await res.json()) as { item?: QuizItem | null; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load question.");
      setItem(json.item ?? null);
    } catch (e) {
      setItem(null);
      setMessage(e instanceof Error ? e.message : "Failed to load question.");
    } finally {
      setLoading(false);
    }
  }, [wordbookId, mode]);

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
      setMessage(
        json.correct
          ? "정답입니다."
          : `오답입니다. 정답: ${json.correctAnswer?.term ?? ""} / ${json.correctAnswer?.meaning ?? ""}`
      );
      await loadNext();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Submit failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Wordbook Quiz</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {mode === "MEANING" ? "의미 퀴즈" : "단어 퀴즈"}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={{ pathname: `/wordbooks/${wordbookId}/memorize` }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
          >
            Memorize
          </Link>
          <Link
            href={{ pathname: `/wordbooks/${wordbookId}/quiz-meaning` }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
          >
            Quiz Meaning
          </Link>
          <Link
            href={{ pathname: `/wordbooks/${wordbookId}/quiz-word` }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
          >
            Quiz Word
          </Link>
          <Link
            href={{ pathname: `/wordbooks/${wordbookId}/list-correct` }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
          >
            List
          </Link>
          <Link
            href={{ pathname: `/wordbooks/${wordbookId}` }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
          >
            Back
          </Link>
        </div>
      </header>

      {!lockMode ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <label className="text-sm font-semibold text-slate-700">
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
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        {!item ? (
          <p className="text-sm text-slate-600">{loading ? "Loading..." : "No quiz items available."}</p>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Question</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">
              {mode === "MEANING" ? item.term : item.meaning}
            </p>
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
                className="min-w-[240px] flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
              <button
                type="submit"
                data-testid="wordbook-quiz-submit"
                disabled={loading}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
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
    </section>
  );
}
