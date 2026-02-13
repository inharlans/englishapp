"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { WordCardDto } from "@/components/types";
import type { QuizType } from "@/lib/types";

type WordListResponse = {
  words: WordCardDto[];
};

type SubmitResponse = {
  correct: boolean;
  correctAnswer: { en: string; ko: string };
};

type TranslateResponse = {
  translatedText?: string;
  error?: string;
};

function shuffleWords(input: WordCardDto[]): WordCardDto[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type CardMotion = "idle" | "swap-out" | "swap-in" | "shake";

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
  const [cardMotion, setCardMotion] = useState<CardMotion>("idle");
  const [isCorrectFlash, setIsCorrectFlash] = useState(false);
  const [isEditingKo, setIsEditingKo] = useState(false);
  const [koDraft, setKoDraft] = useState("");
  const [koUpdateLoading, setKoUpdateLoading] = useState(false);
  const [koUpdateMessage, setKoUpdateMessage] = useState("");
  const [machineMeaning, setMachineMeaning] = useState("");
  const [machineMeaningLoading, setMachineMeaningLoading] = useState(false);
  const [machineMeaningError, setMachineMeaningError] = useState("");

  const timersRef = useRef<number[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const koInputRef = useRef<HTMLInputElement | null>(null);
  const translationCacheRef = useRef<Record<string, string>>({});

  const currentWord = useMemo(() => queue[cursor] ?? null, [queue, cursor]);
  const trimmedAnswer = answer.trim();
  const progress = queue.length === 0 ? 0 : Math.min(((cursor + 1) / queue.length) * 100, 100);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    };
  }, []);

  const addTimer = (callback: () => void, ms: number) => {
    const timer = window.setTimeout(callback, ms);
    timersRef.current.push(timer);
  };

  const loadWeekQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    setResult(null);
    setAnswer("");
    setCursor(0);
    setCardMotion("idle");
    setIsCorrectFlash(false);
    setIsEditingKo(false);
    setKoDraft("");
    setKoUpdateMessage("");
    setMachineMeaning("");
    setMachineMeaningLoading(false);
    setMachineMeaningError("");

    try {
      const url =
        scope === "half"
          ? "/api/words?mode=listHalf&batch=5&page=0"
          : `/api/words?mode=memorize&week=${week}&batch=50&page=0&hideCorrect=false&forQuiz=true&quizType=${quizType}`;
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

  useEffect(() => {
    if (!currentWord || result || loading) {
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 220);

    return () => {
      window.clearTimeout(timer);
    };
  }, [cursor, currentWord, result, loading]);

  useEffect(() => {
    if (!result || result.correct || loading || !currentWord || isEditingKo) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") {
        return;
      }
      event.preventDefault();
      goNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [result, loading, currentWord, isEditingKo]);

  useEffect(() => {
    if (!isEditingKo) {
      return;
    }
    const timer = window.setTimeout(() => {
      koInputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isEditingKo]);

  const goNext = () => {
    if (!currentWord) {
      return;
    }
    setAnswer("");
    setResult(null);
    setIsEditingKo(false);
    setKoDraft("");
    setKoUpdateMessage("");
    setMachineMeaning("");
    setMachineMeaningLoading(false);
    setMachineMeaningError("");
    setCardMotion("swap-out");
    addTimer(() => {
      setCursor((prev) => prev + 1);
      setCardMotion("swap-in");
    }, 120);
    addTimer(() => {
      setCardMotion("idle");
    }, 320);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentWord) {
      return;
    }
    if (result) {
      goNext();
      return;
    }
    if (!trimmedAnswer) {
      return;
    }

    setLoading(true);
    setError("");
    setKoUpdateMessage("");
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordId: currentWord.id,
          quizType,
          userAnswer: trimmedAnswer,
          scope
        })
      });
      const data = (await res.json()) as SubmitResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Submit failed");
      }

      if (data.correct) {
        setResult(data);
        setIsCorrectFlash(true);
        setCardMotion("swap-out");

        addTimer(() => {
          setAnswer("");
          setResult(null);
          setCursor((prev) => prev + 1);
          setCardMotion("swap-in");
        }, 180);

        addTimer(() => {
          setCardMotion("idle");
          setIsCorrectFlash(false);
        }, 420);
        return;
      }

      setResult(data);
      setCardMotion("shake");
      addTimer(() => {
        setCardMotion("idle");
      }, 360);

      // Wrong answer word is re-queued 10 questions later in this week queue.
      setQueue((prev) => {
        const copy = [...prev];
        const insertIndex = Math.min(cursor + 11, copy.length);
        copy.splice(insertIndex, 0, currentWord);
        return copy;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!result || result.correct || !currentWord) {
      return;
    }

    const key = currentWord.en;
    const cached = translationCacheRef.current[key];
    if (cached) {
      setMachineMeaning(cached);
      setMachineMeaningError("");
      setMachineMeaningLoading(false);
      return;
    }

    let isActive = true;
    setMachineMeaning("");
    setMachineMeaningError("");
    setMachineMeaningLoading(true);

    const fetchTranslation = async () => {
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: currentWord.en,
            source: "en",
            target: "ko"
          })
        });
        const data = (await res.json()) as TranslateResponse;
        if (!res.ok || !data.translatedText) {
          throw new Error(data.error ?? "Failed to load translation.");
        }
        if (!isActive) {
          return;
        }

        translationCacheRef.current[key] = data.translatedText;
        setMachineMeaning(data.translatedText);
      } catch (e) {
        if (!isActive) {
          return;
        }
        setMachineMeaningError(e instanceof Error ? e.message : "Failed to load translation.");
      } finally {
        if (isActive) {
          setMachineMeaningLoading(false);
        }
      }
    };

    void fetchTranslation();

    return () => {
      isActive = false;
    };
  }, [result, currentWord]);

  const startKoEdit = () => {
    if (!result || result.correct) {
      return;
    }
    setKoDraft(result.correctAnswer.ko);
    setIsEditingKo(true);
    setKoUpdateMessage("");
  };

  const submitKoEdit = async () => {
    if (!currentWord) {
      return;
    }
    const nextKo = koDraft.trim();
    if (!nextKo) {
      setKoUpdateMessage("Meaning cannot be empty.");
      return;
    }

    setKoUpdateLoading(true);
    setKoUpdateMessage("");
    try {
      const res = await fetch(`/api/words/${currentWord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ko: nextKo })
      });
      const data = (await res.json()) as { word?: { id: number; ko: string }; error?: string };
      if (!res.ok || !data.word) {
        throw new Error(data.error ?? "Failed to update meaning");
      }

      setQueue((prev) =>
        prev.map((word) => (word.id === currentWord.id ? { ...word, ko: data.word!.ko } : word))
      );
      setResult((prev) =>
        prev
          ? {
              ...prev,
              correctAnswer: { ...prev.correctAnswer, ko: data.word!.ko }
            }
          : prev
      );
      setIsEditingKo(false);
      setKoDraft("");
      setKoUpdateMessage("Meaning updated.");
    } catch (e) {
      setKoUpdateMessage(e instanceof Error ? e.message : "Failed to update meaning.");
    } finally {
      setKoUpdateLoading(false);
    }
  };

  const isWrong = result ? !result.correct : false;
  const cardToneClass = isCorrectFlash
    ? "border-emerald-300 bg-emerald-50"
    : isWrong
      ? "border-rose-300 bg-rose-50"
      : "border-slate-200 bg-white";

  const cardMotionClass =
    cardMotion === "swap-out"
      ? "quiz-card-swap-out"
      : cardMotion === "swap-in"
        ? "quiz-card-swap-in"
        : cardMotion === "shake"
          ? "quiz-card-shake"
          : "";

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
        </div>

        {scope === "half" ? (
          <p className="mt-3 inline-flex rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800">
            Half list only quiz mode
          </p>
        ) : null}

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Progress {Math.min(cursor + 1, queue.length)} / {queue.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <article
        className={`rounded-3xl border p-5 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.7)] transition-[background-color,border-color,box-shadow] duration-300 ${cardToneClass} ${cardMotionClass}`}
      >
        {!currentWord ? (
          <p className="text-sm text-slate-600">No more quiz words in this queue.</p>
        ) : (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Question</p>
            <p className="mb-4 text-3xl font-bold tracking-tight text-slate-900">
              {quizType === "MEANING" ? currentWord.en : currentWord.ko}
            </p>

            <form className="space-y-3" onSubmit={onSubmit}>
              <input
                ref={inputRef}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={quizType === "MEANING" ? "Enter meaning" : "Enter word"}
                disabled={Boolean(result)}
                autoFocus
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading || Boolean(result) || !trimmedAnswer}
                >
                  Submit
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={goNext}
                  disabled={loading || !currentWord}
                >
                  Next question
                </button>
              </div>
            </form>

            {result ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white/90 p-3 text-sm shadow-sm">
                <p className={result.correct ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>
                  {result.correct ? "Correct" : "Wrong"}
                </p>
                {!result.correct ? (
                  <>
                    <p className="mt-1 text-slate-700">
                      Answer: {result.correctAnswer.en} / {result.correctAnswer.ko}
                    </p>
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      <p className="font-semibold text-slate-600">Google Translate (Reference)</p>
                      {machineMeaningLoading ? (
                        <p className="mt-1 text-slate-500">Loading...</p>
                      ) : machineMeaningError ? (
                        <p className="mt-1 text-rose-700">{machineMeaningError}</p>
                      ) : machineMeaning ? (
                        <p className="mt-1">{machineMeaning}</p>
                      ) : (
                        <p className="mt-1 text-slate-500">No translation available.</p>
                      )}
                    </div>
                    <div className="mt-3 space-y-2">
                      {isEditingKo ? (
                        <div className="flex flex-wrap gap-2">
                          <input
                            ref={koInputRef}
                            className="min-w-[260px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                            value={koDraft}
                            onChange={(e) => setKoDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") {
                                return;
                              }
                              e.preventDefault();
                              void submitKoEdit();
                            }}
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
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => {
                              setIsEditingKo(false);
                              setKoDraft("");
                              setKoUpdateMessage("");
                            }}
                            disabled={koUpdateLoading}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 transition hover:bg-teal-100"
                          onClick={startKoEdit}
                        >
                          Edit meaning
                        </button>
                      )}
                      {koUpdateMessage ? <p className="text-xs text-slate-600">{koUpdateMessage}</p> : null}
                    </div>
                  </>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-500">Tip: press Enter to submit quickly.</p>
            )}
          </>
        )}
      </article>

      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}
