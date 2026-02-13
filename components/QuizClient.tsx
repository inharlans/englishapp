"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { WordCardDto } from "@/components/types";
import type { QuizType } from "@/lib/types";

type WordListResponse = {
  words: WordCardDto[];
};

type SubmitResponse = {
  correct: boolean;
  correctAnswer: { en: string; ko: string };
};

function shuffleWords(input: WordCardDto[]): WordCardDto[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function QuizClient({ quizType }: { quizType: QuizType }) {
  const searchParams = useSearchParams();
  const scope = searchParams.get("scope") === "half" ? "half" : undefined;
  const initialWeek = Number(searchParams.get("week") ?? "1");

  const [week, setWeek] = useState(
    Number.isFinite(initialWeek) && initialWeek >= 1 ? Math.floor(initialWeek) : 1
  );
  const [queue, setQueue] = useState<WordCardDto[]>([]);
  const [cursor, setCursor] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentWord = useMemo(() => queue[cursor] ?? null, [queue, cursor]);

  const loadWeekQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    setResult(null);
    setAnswer("");
    setCursor(0);

    try {
      const url =
        scope === "half"
          ? "/api/words?mode=listHalf&batch=5&page=0"
          : `/api/words?mode=memorize&week=${week}&batch=50&page=0&hideCorrect=false`;
      const res = await fetch(url);
      const data = (await res.json()) as WordListResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load quiz words");
      }
      const words = data.words ?? [];
      setQueue(shuffleWords(words));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load quiz words");
    } finally {
      setLoading(false);
    }
  }, [scope, week]);

  useEffect(() => {
    loadWeekQueue();
  }, [loadWeekQueue]);

  const goNext = () => {
    setAnswer("");
    setResult(null);
    setCursor((prev) => prev + 1);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentWord || result) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordId: currentWord.id,
          quizType,
          userAnswer: answer,
          scope
        })
      });
      const data = (await res.json()) as SubmitResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Submit failed");
      }
      setResult(data);

      // Wrong answer word is re-queued 10 questions later in this week queue.
      if (!data.correct) {
        setQueue((prev) => {
          const copy = [...prev];
          const insertIndex = Math.min(cursor + 11, copy.length);
          copy.splice(insertIndex, 0, currentWord);
          return copy;
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setLoading(false);
    }
  };

  const isWrong = result ? !result.correct : false;
  const cardClass = isWrong ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white";

  return (
    <section className="space-y-4">
      <header className="rounded-2xl bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold">
          {quizType === "MEANING" ? "/quiz-meaning Meaning Quiz" : "/quiz-word Word Quiz"}
        </h1>
        <div className="mt-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span>Week</span>
            <select
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
              className="rounded-lg border border-slate-300 px-2 py-1"
              disabled={scope === "half"}
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  week{w}
                </option>
              ))}
            </select>
          </label>
        </div>
        {scope === "half" ? (
          <p className="mt-2 text-sm text-slate-600">Half list only quiz mode</p>
        ) : null}
        <p className="mt-2 text-sm text-slate-500">
          Progress: {Math.min(cursor + 1, queue.length)} / {queue.length}
        </p>
      </header>

      <article className={`rounded-2xl border p-4 shadow-sm ${cardClass}`}>
        {!currentWord ? (
          <p className="text-sm text-slate-600">No more quiz words in this queue.</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-500">Question</p>
            <p className="mb-4 text-2xl font-semibold">
              {quizType === "MEANING" ? currentWord.en : currentWord.ko}
            </p>
            <form className="space-y-3" onSubmit={onSubmit}>
              <input
                className="w-full rounded-lg border border-slate-300 p-2"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={quizType === "MEANING" ? "Enter meaning" : "Enter word"}
                disabled={Boolean(result)}
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
                disabled={loading || Boolean(result)}
              >
                Submit
              </button>
            </form>

            {result ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <p className={result.correct ? "text-emerald-700" : "text-rose-700"}>
                  {result.correct ? "Correct" : "Wrong"}
                </p>
                {!result.correct ? (
                  <p className="mt-1 text-slate-700">
                    Answer: {result.correctAnswer.en} / {result.correctAnswer.ko}
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </article>

      <div>
        <button
          className="rounded-lg border border-slate-300 px-4 py-2"
          onClick={goNext}
          disabled={loading || !currentWord}
        >
          Next question
        </button>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}
