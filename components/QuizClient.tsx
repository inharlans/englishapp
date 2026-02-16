"use client";

import { apiFetch } from "@/lib/clientApi";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MeaningView } from "@/components/MeaningView";
import { StudySourcePicker } from "@/components/StudySourcePicker";
import type { WordCardDto } from "@/components/types";
import { useStudySource } from "@/components/useStudySource";
import type { QuizType } from "@/lib/types";

type WordListResponse = {
  words: WordCardDto[];
};

type CoreSubmitResponse = {
  correct: boolean;
  partial?: boolean;
  correctAnswer: { en: string; ko: string };
};

type WordbookQuizItem = {
  id: number;
  term: string;
  meaning: string;
  example: string | null;
  exampleMeaning: string | null;
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
  const { source, setSource, downloaded, error: sourceError } = useStudySource();

  const [week, setWeek] = useState(
    Number.isFinite(initialWeek) && initialWeek >= 1 ? Math.floor(initialWeek) : 1
  );
  const [queue, setQueue] = useState<WordCardDto[]>([]);
  const [cursor, setCursor] = useState(0);
  const [wordbookItem, setWordbookItem] = useState<WordbookQuizItem | null>(null);
  const [wordbookAnsweredCount, setWordbookAnsweredCount] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<CoreSubmitResponse | null>(null);
  const [wordbookResult, setWordbookResult] = useState<{
    correct: boolean;
    correctAnswer: { term: string; meaning: string };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEditingKo, setIsEditingKo] = useState(false);
  const [koDraft, setKoDraft] = useState("");
  const [koUpdateLoading, setKoUpdateLoading] = useState(false);
  const [koUpdateMessage, setKoUpdateMessage] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isCore = source.kind === "core";
  const currentWord = useMemo(() => queue[cursor] ?? null, [queue, cursor]);
  const trimmedAnswer = answer.trim();
  const coreProgress = queue.length === 0 ? 0 : Math.min(((cursor + 1) / queue.length) * 100, 100);

  const loadCoreQueue = useCallback(async () => {
    const url =
      scope === "half"
        ? "/api/words?mode=listHalf&batch=200&page=0"
        : `/api/words?mode=memorize&week=${week}&batch=50&page=0&hideCorrect=false&forQuiz=true&quizType=${quizType}`;
    const res = await apiFetch(url);
    const data = (await res.json()) as WordListResponse & { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to load quiz words");
    setQueue(shuffleWords(data.words ?? []));
    setCursor(0);
  }, [quizType, scope, week]);

  const loadWordbookQuestion = useCallback(async () => {
    if (source.kind !== "wordbook") return;
    const mode = quizType === "WORD" ? "WORD" : "MEANING";
    const res = await apiFetch(`/api/wordbooks/${source.wordbookId}/quiz?mode=${mode}`, {
      cache: "no-store"
    });
    const data = (await res.json()) as { item?: WordbookQuizItem | null; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to load wordbook quiz");
    setWordbookItem(data.item ?? null);
  }, [quizType, source]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      setAnswer("");
      setResult(null);
      setWordbookResult(null);
      setKoUpdateMessage("");
      setIsEditingKo(false);
      try {
        if (isCore) {
          await loadCoreQueue();
        } else {
          setWordbookAnsweredCount(0);
          await loadWordbookQuestion();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load quiz");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [isCore, loadCoreQueue, loadWordbookQuestion, source.kind === "core" ? "core" : source.wordbookId]);

  useEffect(() => {
    if (loading) return;
    if (isCore && !currentWord) return;
    if (!isCore && !wordbookItem) return;
    inputRef.current?.focus();
  }, [loading, isCore, currentWord, wordbookItem]);

  const goNextCore = () => {
    setAnswer("");
    setResult(null);
    setIsEditingKo(false);
    setKoDraft("");
    setKoUpdateMessage("");
    setCursor((prev) => prev + 1);
  };

  const goNextWordbook = async () => {
    setAnswer("");
    setWordbookResult(null);
    setLoading(true);
    try {
      await loadWordbookQuestion();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load next question");
    } finally {
      setLoading(false);
    }
  };

  const submitCore = async () => {
    if (!currentWord || !trimmedAnswer) return;
    const res = await apiFetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wordId: currentWord.id,
        quizType,
        userAnswer: trimmedAnswer,
        scope
      })
    });
    const data = (await res.json()) as CoreSubmitResponse & { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Submit failed");
    setResult(data);
    if (data.correct && !data.partial) {
      goNextCore();
    }
  };

  const submitWordbook = async () => {
    if (source.kind !== "wordbook" || !wordbookItem || !trimmedAnswer) return;
    const mode = quizType === "WORD" ? "WORD" : "MEANING";
    const res = await apiFetch(`/api/wordbooks/${source.wordbookId}/quiz/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: wordbookItem.id, mode, answer: trimmedAnswer })
    });
    const data = (await res.json()) as {
      correct?: boolean;
      correctAnswer?: { term: string; meaning: string };
      error?: string;
    };
    if (!res.ok || typeof data.correct !== "boolean" || !data.correctAnswer) {
      throw new Error(data.error ?? "Submit failed");
    }
    setWordbookResult({ correct: data.correct, correctAnswer: data.correctAnswer });
    setWordbookAnsweredCount((prev) => prev + 1);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!trimmedAnswer) return;
    setLoading(true);
    setError("");
    try {
      if (isCore) {
        await submitCore();
      } else {
        await submitWordbook();
      }
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Submit failed");
    } finally {
      setLoading(false);
    }
  };

  const submitKoEdit = async () => {
    if (!currentWord) return;
    const nextKo = koDraft.trim();
    if (!nextKo) {
      setKoUpdateMessage("Meaning cannot be empty.");
      return;
    }
    setKoUpdateLoading(true);
    setKoUpdateMessage("");
    try {
      const res = await apiFetch(`/api/words/${currentWord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ko: nextKo })
      });
      const data = (await res.json()) as { word?: { id: number; ko: string }; error?: string };
      if (!res.ok || !data.word) throw new Error(data.error ?? "Failed to update meaning");
      setQueue((prev) => prev.map((w) => (w.id === currentWord.id ? { ...w, ko: data.word!.ko } : w)));
      setResult((prev) =>
        prev ? { ...prev, correctAnswer: { ...prev.correctAnswer, ko: data.word!.ko } } : prev
      );
      setKoUpdateMessage("Meaning updated.");
      setIsEditingKo(false);
    } catch (e) {
      setKoUpdateMessage(e instanceof Error ? e.message : "Failed to update meaning.");
    } finally {
      setKoUpdateLoading(false);
    }
  };

  const currentQuestion = isCore
    ? currentWord
      ? quizType === "MEANING"
        ? currentWord.en
        : currentWord.ko
      : null
    : wordbookItem
      ? quizType === "MEANING"
        ? wordbookItem.term
        : wordbookItem.meaning
      : null;

  return (
    <section className="space-y-4">
      <header className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Quiz Mode</p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {quizType === "MEANING" ? "Meaning Quiz" : "Word Quiz"}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <StudySourcePicker source={source} downloaded={downloaded} onChange={setSource} />
            {isCore ? (
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span className="font-medium">Week</span>
                <select
                  value={week}
                  onChange={(e) => setWeek(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  disabled={scope === "half"}
                >
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w}>
                      week{w}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </div>

        {isCore ? (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Progress {Math.min(cursor + 1, queue.length)} / {queue.length}
              </span>
              <span>{Math.round(coreProgress)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-500"
                style={{ width: `${coreProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500">이번 세션 정답 제출: {wordbookAnsweredCount}</p>
        )}
      </header>

      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.7)]">
        {!currentQuestion ? (
          <p className="text-sm text-slate-600">{loading ? "Loading..." : "No quiz words available."}</p>
        ) : (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Question</p>
            <p className="mb-4 text-3xl font-bold tracking-tight text-slate-900">{currentQuestion}</p>

            {!isCore && wordbookItem?.example ? (
              <p className="mb-3 text-xs text-slate-500">
                e.g. {wordbookItem.example}
                {wordbookItem.exampleMeaning ? ` - ${wordbookItem.exampleMeaning}` : ""}
              </p>
            ) : null}

            <form className="space-y-3" onSubmit={onSubmit}>
              <input
                ref={inputRef}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={quizType === "MEANING" ? "Enter meaning" : "Enter word"}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading || !trimmedAnswer}
                >
                  Submit
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => void (isCore ? goNextCore() : goNextWordbook())}
                  disabled={loading}
                >
                  Next question
                </button>
              </div>
            </form>

            {isCore && result ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white/90 p-3 text-sm shadow-sm">
                <p className={result.correct ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>
                  {result.correct ? "Correct" : "Wrong"}
                </p>
                {!result.correct || result.partial ? (
                  <p className="mt-1 text-slate-700">
                    Answer: {result.correctAnswer.en} / <MeaningView value={result.correctAnswer.ko} />
                  </p>
                ) : null}
                {!result.correct && !result.partial ? (
                  <div className="mt-3 space-y-2">
                    {isEditingKo ? (
                      <div className="flex flex-wrap gap-2">
                        <input
                          className="min-w-[260px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                          value={koDraft}
                          onChange={(e) => setKoDraft(e.target.value)}
                          placeholder="Update meaning"
                          disabled={koUpdateLoading}
                        />
                        <button
                          type="button"
                          className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => void submitKoEdit()}
                          disabled={koUpdateLoading}
                        >
                          Save meaning
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          onClick={() => setIsEditingKo(false)}
                          disabled={koUpdateLoading}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 transition hover:bg-teal-100"
                        onClick={() => {
                          setKoDraft(result.correctAnswer.ko);
                          setIsEditingKo(true);
                        }}
                      >
                        Edit meaning
                      </button>
                    )}
                    {koUpdateMessage ? <p className="text-xs text-slate-600">{koUpdateMessage}</p> : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {!isCore && wordbookResult ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white/90 p-3 text-sm shadow-sm">
                <p className={wordbookResult.correct ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>
                  {wordbookResult.correct ? "Correct" : "Wrong"}
                </p>
                {!wordbookResult.correct ? (
                  <p className="mt-1 text-slate-700">
                    Answer: {wordbookResult.correctAnswer.term} /{" "}
                    <MeaningView value={wordbookResult.correctAnswer.meaning} />
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">다운로드 단어장 데이터는 수정되지 않습니다.</p>
              </div>
            ) : null}
          </>
        )}
      </article>

      {sourceError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{sourceError}</p>
      ) : null}
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}

