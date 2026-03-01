"use client";

import { fetchWordbookQuizQuestion, submitWordbookQuizAnswer, type QuizItem, type QuizMode } from "@/lib/api/quiz";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Route } from "next";

import { MeaningView } from "@/components/MeaningView";
import { SessionRecapPanel } from "@/components/wordbooks/SessionRecapPanel";
import { WordbookStudyTabs } from "@/components/wordbooks/WordbookStudyTabs";
import { useMeaningViewMode } from "@/components/wordbooks/useMeaningViewMode";
import { useWordbookParting } from "@/components/wordbooks/useWordbookParting";
import { DensityModeToggle } from "@/components/ui/DensityModeToggle";
import { useDensityMode } from "@/components/ui/useDensityMode";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import { sanitizeUserText } from "@/lib/textQuality";

type Props = {
  wordbookId: number;
  initialMode?: QuizMode;
  lockMode?: boolean;
};

function parseBoundedInt(raw: string, fallback: number, min: number, max: number) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

export function WordbookQuizClient({ wordbookId, initialMode = "MEANING" }: Props) {
  const [mode] = useState<QuizMode>(initialMode);
  const [item, setItem] = useState<QuizItem | null>(null);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    correctAnswer?: { term: string; meaning: string };
    acceptedMeaningAnswers?: string[];
    gradingDiagnosis?: {
      input: string;
      normalizedInput: string;
      closestAccepted: string;
      similarityScore: number;
      potentiallyDisputable: boolean;
      reason: string;
    };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [corrects, setCorrects] = useState(0);
  const [wrongs, setWrongs] = useState(0);
  const [partAttempts, setPartAttempts] = useState(0);
  const [partSolvedIds, setPartSolvedIds] = useState<number[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [partItemCount, setPartItemCount] = useState(0);
  const [partJump, setPartJump] = useState("1");
  const [autoNextOnCorrect, setAutoNextOnCorrect] = useState(false);
  const skipInitialPartNoticeRef = useRef(true);
  const answerInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  const requestSeqRef = useRef(0);
  const { mode: meaningMode, setMode: setMeaningMode } = useMeaningViewMode();
  const { mode: densityMode, setMode: setDensityMode } = useDensityMode();
  const { partSize, setPartSize, partIndex, setPartIndex, partCount } = useWordbookParting(wordbookId, totalItems);
  const draftKey = `wordbook_quiz_draft_${wordbookId}_${mode}_${partSize}_${partIndex}`;
  const autoNextKey = `wordbook_quiz_auto_next_correct_${wordbookId}_${mode}`;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(autoNextKey);
    if (raw === "1") setAutoNextOnCorrect(true);
  }, [autoNextKey]);

  const resetPartScopedState = useCallback(
    (nextPart: number) => {
      setPartIndex(nextPart);
      setPartAttempts(0);
      setPartSolvedIds([]);
      setFeedback(null);
      setMessage("");
    },
    [setPartIndex]
  );

  const loadNext = useCallback(async () => {
    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;
    setLoading(true);
    setMessage("");
    setAnswer("");
    setFeedback(null);
    try {
      const json = await fetchWordbookQuizQuestion({
        wordbookId,
        mode,
        partSize,
        partIndex
      });
      if (!mountedRef.current || requestSeqRef.current !== requestSeq) return;
      setItem(json.item ?? null);
      setTotalItems(json.totalItems ?? 0);
      setPartItemCount(json.partItemCount ?? 0);
    } catch (e) {
      if (!mountedRef.current || requestSeqRef.current !== requestSeq) return;
      setItem(null);
      setMessage(e instanceof Error ? e.message : "문제를 불러오지 못했습니다.");
    } finally {
      if (!mountedRef.current || requestSeqRef.current !== requestSeq) return;
      setLoading(false);
    }
  }, [mode, partIndex, partSize, wordbookId]);

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  useEffect(() => {
    if (!loading && item && !feedback) {
      answerInputRef.current?.focus();
    }
  }, [feedback, item, loading]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(draftKey);
    if (!raw) return;
    setAnswer(raw);
  }, [draftKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const trimmed = answer.trim();
    if (!trimmed) {
      window.localStorage.removeItem(draftKey);
      return;
    }
    window.localStorage.setItem(draftKey, answer);
  }, [answer, draftKey]);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    setPartJump(String(partIndex));
    if (skipInitialPartNoticeRef.current) {
      skipInitialPartNoticeRef.current = false;
      return;
    }
    setMessage(`${partIndex}파트로 이동했습니다.`);
  }, [partIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInteractive =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.tagName === "BUTTON" ||
          target.tagName === "A" ||
          target.getAttribute("contenteditable") === "true" ||
          Boolean(target.closest("input, textarea, select, button, a, [contenteditable='true']")));

      if (event.key === "Escape" && !feedback && answer.trim()) {
        event.preventDefault();
        setAnswer("");
        return;
      }

      if (isInteractive) return;

      if (event.key === "/") {
        event.preventDefault();
        answerInputRef.current?.focus();
      }
      if (event.key.toLowerCase() === "n" && feedback) {
        event.preventDefault();
        void loadNext();
      }
      if (event.key.toLowerCase() === "s" && !feedback && !loading) {
        event.preventDefault();
        void loadNext();
        setMessage("문제를 건너뛰었습니다.");
      }
      if (event.key === "[" && !loading) {
        event.preventDefault();
        if (partIndex <= 1) {
          setMessage("첫 파트입니다.");
          return;
        }
        resetPartScopedState(Math.max(1, partIndex - 1));
      }
      if (event.key === "]" && !loading) {
        event.preventDefault();
        if (partIndex >= partCount) {
          setMessage("마지막 파트입니다.");
          return;
        }
        resetPartScopedState(Math.min(partCount, partIndex + 1));
      }
      if (event.key === "Home" && !loading) {
        event.preventDefault();
        if (partIndex <= 1) {
          setMessage("첫 파트입니다.");
          return;
        }
        resetPartScopedState(1);
      }
      if (event.key === "End" && !loading) {
        event.preventDefault();
        if (partIndex >= partCount) {
          setMessage("마지막 파트입니다.");
          return;
        }
        resetPartScopedState(partCount);
      }
      if (event.key === "Enter" && feedback) {
        event.preventDefault();
        void loadNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [answer, feedback, loadNext, loading, partCount, partIndex, resetPartScopedState]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback) {
      await loadNext();
      return;
    }
    if (!item || !answer.trim()) return;
    setLoading(true);
    setMessage("");
    try {
      const json = await submitWordbookQuizAnswer({
        wordbookId,
        itemId: item.id,
        mode,
        answer: answer.trim()
      });
      setAttempts((v) => v + 1);
      setPartAttempts((v) => v + 1);
      setPartSolvedIds((prev) => {
        if (!item || prev.includes(item.id)) return prev;
        return [...prev, item.id];
      });
      if (json.correct) {
        setCorrects((v) => v + 1);
      } else {
        setWrongs((v) => v + 1);
      }
      setFeedback({
        isCorrect: Boolean(json.correct),
        correctAnswer: json.correctAnswer,
        acceptedMeaningAnswers: json.acceptedMeaningAnswers,
        gradingDiagnosis: json.gradingDiagnosis
      });
      setAnswer("");
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(draftKey);
      }
      if (json.correct && autoNextOnCorrect) {
        window.setTimeout(() => {
          void loadNext();
        }, 300);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "제출에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const activeTab = mode === "MEANING" ? "quiz-meaning" : "quiz-word";
  const recommendation =
    wrongs > corrects
      ? {
          href: `/wordbooks/${wordbookId}/list-wrong` as Route,
          label: "오답 목록 복습",
          eta: "4m",
          reason: "오답이 더 많으니 취약 단어를 먼저 보완하세요."
        }
      : {
          href: `/wordbooks/${wordbookId}/memorize` as Route,
          label: "암기 점검",
          eta: "3m",
          reason: "퀴즈 직후 짧은 암기 복습이 기억 유지에 효과적입니다."
        };

  const partButtons = useMemo(() => Array.from({ length: partCount }, (_, idx) => idx + 1), [partCount]);
  const visiblePartButtons = useMemo(() => {
    if (partCount <= 9) return partButtons.map((n) => ({ kind: "part" as const, value: n }));
    const set = new Set<number>([1, partCount]);
    for (let n = partIndex - 2; n <= partIndex + 2; n += 1) {
      if (n >= 1 && n <= partCount) set.add(n);
    }
    const sorted = Array.from(set).sort((a, b) => a - b);
    const result: Array<{ kind: "part"; value: number } | { kind: "ellipsis"; id: string }> = [];
    for (let i = 0; i < sorted.length; i += 1) {
      const current = sorted[i];
      const prev = sorted[i - 1];
      if (prev && current - prev > 1) {
        result.push({ kind: "ellipsis", id: `ellipsis-${prev}-${current}` });
      }
      result.push({ kind: "part", value: current });
    }
    return result;
  }, [partButtons, partCount, partIndex]);
  const accuracy = attempts > 0 ? Math.round((corrects / attempts) * 100) : 0;
  const solvedInPart = partSolvedIds.length;
  const currentPartProgress = partItemCount > 0 ? Math.min(100, Math.round((solvedInPart / partItemCount) * 100)) : 0;
  const remainingInPart = Math.max(partItemCount - solvedInPart, 0);
  const remainingParts = Math.max(partCount - partIndex, 0);
  const totalItemsLabel = loading && totalItems === 0 ? "-" : String(totalItems);
  const partCountLabel = loading && totalItems === 0 ? "-" : String(partCount);
  const remainingPartsLabel = loading && totalItems === 0 ? "-" : String(remainingParts);
  const remainingInPartLabel = loading && totalItems === 0 ? "-" : String(remainingInPart);
  const acceptedMeaningPreview = useMemo(() => {
    if (!feedback || feedback.isCorrect || mode !== "MEANING") return [];
    const list = feedback.acceptedMeaningAnswers ?? [];
    const normalized = list
      .flatMap((entry) => sanitizeUserText(entry, "").split(","))
      .map((entry) => entry.trim())
      .map((entry) => entry.replace(/^[^0-9A-Za-z가-힣]+/, "").replace(/[^0-9A-Za-z가-힣]+$/, "").trim())
      .filter(Boolean);
    return Array.from(new Set(normalized)).slice(0, 8);
  }, [feedback, mode]);

  return (
    <section className="space-y-4">
      <header className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">단어장 퀴즈</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {mode === "MEANING" ? "의미 퀴즈" : "단어 퀴즈"}
          </h1>
        </div>
        <WordbookStudyTabs wordbookId={wordbookId} active={activeTab} />
      </header>

      <div className="ui-card p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-600">품사/의미 표시</div>
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
              간결
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
              자세히
            </button>
          </div>
          <DensityModeToggle mode={densityMode} onChange={setDensityMode} />
        </div>
      </div>

      <div className="ui-card p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label htmlFor="quiz-part-size" className="font-semibold text-slate-700">파트 크기(n)</label>
          <input
            id="quiz-part-size"
            type="number"
            min={1}
            max={200}
            value={partSize}
            onChange={(e) => {
              const next = parseBoundedInt(e.target.value, partSize, 1, 200);
              setPartSize(next);
              setPartJump("1");
              resetPartScopedState(1);
            }}
            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          />
          <span className="text-slate-500">
            총 {totalItemsLabel}개 / {partCountLabel}개 파트
          </span>
          <span className="text-slate-500">
            · 정답률 {accuracy}% ({corrects}/{attempts})
          </span>
          <span className="text-slate-500">· 남은 파트 {remainingPartsLabel}개</span>
            <span className="text-slate-500">· 현재 파트 남은 문제 {remainingInPartLabel}개</span>
            <span className="text-slate-500">· 단축키: `/` 입력 포커스 · `S` 건너뛰기 · `N`/`Enter` 다음 · `Esc` 입력 비우기 · `[`/`]` 파트 이동 · `Home`/`End` 처음/끝</span>
          <button
            type="button"
            onClick={() => {
              setAutoNextOnCorrect((value) => {
                const next = !value;
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(autoNextKey, next ? "1" : "0");
                }
                return next;
              });
            }}
            aria-pressed={autoNextOnCorrect}
            className="ui-btn-secondary px-3 py-1 text-xs"
          >
            정답 시 자동 다음 {autoNextOnCorrect ? "켜짐" : "꺼짐"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="wordbook-quiz-part-select">
            파트 선택
          </label>
          <select
            id="wordbook-quiz-part-select"
            value={partIndex}
            onChange={(e) => {
              resetPartScopedState(Number(e.target.value));
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:hidden"
          >
            {partButtons.map((n) => (
              <option key={`part-select-${n}`} value={n}>
                {n}파트
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              if (partIndex <= 1) {
                setMessage("첫 파트입니다.");
                return;
              }
              resetPartScopedState(1);
            }}
            disabled={loading || partIndex <= 1}
            className="ui-btn-secondary w-full px-3 py-2 text-sm sm:w-auto disabled:opacity-50"
          >
            처음
          </button>
          <button
            type="button"
            onClick={() => {
              if (partIndex <= 1) {
                setMessage("첫 파트입니다.");
                return;
              }
              resetPartScopedState(Math.max(1, partIndex - 1));
            }}
            disabled={loading || partIndex <= 1}
            className="ui-btn-secondary w-full px-3 py-2 text-sm sm:w-auto disabled:opacity-50"
            aria-label={`${Math.max(1, partIndex - 1)}파트로 이동`}
          >
            이전 파트
          </button>
          <button
            type="button"
            onClick={() => {
              if (partIndex >= partCount) {
                setMessage("마지막 파트입니다.");
                return;
              }
              resetPartScopedState(Math.min(partCount, partIndex + 1));
            }}
            disabled={loading || partIndex >= partCount}
            className="ui-btn-secondary w-full px-3 py-2 text-sm sm:w-auto disabled:opacity-50"
            aria-label={`${Math.min(partCount, partIndex + 1)}파트로 이동`}
          >
            다음 파트
          </button>
          <button
            type="button"
            onClick={() => {
              if (partIndex >= partCount) {
                setMessage("마지막 파트입니다.");
                return;
              }
              resetPartScopedState(partCount);
            }}
            disabled={loading || partIndex >= partCount}
            className="ui-btn-secondary w-full px-3 py-2 text-sm sm:w-auto disabled:opacity-50"
          >
            마지막
          </button>
          <form
            className="flex w-full items-center gap-2 sm:w-auto"
            onSubmit={(event) => {
              event.preventDefault();
              const next = parseBoundedInt(partJump, partIndex, 1, partCount);
              setPartJump(String(next));
              resetPartScopedState(next);
            }}
          >
            <label htmlFor="quiz-part-jump" className="sr-only">
              이동할 파트 번호
            </label>
            <input
              id="quiz-part-jump"
              type="number"
              min={1}
              max={partCount}
              value={partJump}
              onChange={(event) => setPartJump(event.target.value)}
              onBlur={() => {
                setPartJump(String(parseBoundedInt(partJump, partIndex, 1, partCount)));
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:w-24"
            />
            <button type="submit" className="ui-btn-secondary px-3 py-2 text-sm">
              이동
            </button>
          </form>
        </div>
        <div className="mt-3 hidden flex-wrap gap-2 sm:flex">
          {visiblePartButtons.map((entry) =>
            entry.kind === "ellipsis" ? (
              <span key={entry.id} className="px-2 py-1 text-xs font-semibold text-slate-400" aria-hidden="true">
                ...
              </span>
            ) : (
              <button
                key={entry.value}
                type="button"
                onClick={() => {
                  if (loading) return;
                  resetPartScopedState(entry.value);
                }}
                className={[
                  "rounded-lg border px-3 py-1 text-xs font-semibold",
                  entry.value === partIndex
                    ? "ui-tab-active"
                    : "ui-tab-inactive"
                ].join(" ")}
                aria-label={`${entry.value}파트 ${entry.value === partIndex ? "선택됨" : "선택"}`}
                aria-current={entry.value === partIndex ? "page" : undefined}
                disabled={loading}
              >
                {entry.value}파트
              </button>
            )
          )}
        </div>
      </div>

      <div
        className={
          densityMode === "compact" ? "ui-card p-3" : densityMode === "focus" ? "ui-card p-6" : "ui-card p-5"
        }
      >
        {!item ? (
          loading ? (
            <p className="text-sm text-slate-600" role="status" aria-live="polite">불러오는 중...</p>
          ) : (
            <EmptyStateCard
              title="출제 가능한 문제가 없습니다"
              description={`${partIndex}파트 (${partItemCount}개)에서 먼저 학습 상태를 만들거나 다른 파트를 선택해보세요.`}
              primary={{ label: "단어장 상세로 이동", href: `/wordbooks/${wordbookId}` }}
              secondary={{ label: "암기 시작", href: `/wordbooks/${wordbookId}/memorize` }}
            />
          )
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">문제</p>
            <p className="mt-1 text-xs text-slate-500">
              {partIndex}파트 / {partItemCount}개 단어
            </p>
            <div
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label={`파트 진행률 ${currentPartProgress}%`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={currentPartProgress}
            >
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${currentPartProgress}%` }} />
            </div>
            <div className="mt-2 text-3xl font-black tracking-tight text-slate-900">
              {mode === "MEANING" ? item.term : <MeaningView value={sanitizeUserText(item.meaning, "의미 데이터 점검 중입니다")} mode={meaningMode} />}
            </div>
            {item.example ? (
              <p className="mt-2 text-sm text-slate-500">
                예문: {sanitizeUserText(item.example, "예문 데이터 점검 중입니다")}
                {item.exampleMeaning ? ` - ${sanitizeUserText(item.exampleMeaning, "예문 해석 데이터 점검 중입니다")}` : ""}
              </p>
            ) : null}
            <form onSubmit={onSubmit} className="mt-4 flex flex-wrap gap-2">
              <label htmlFor="wordbook-quiz-answer" className="sr-only">
                정답
              </label>
              <input
                id="wordbook-quiz-answer"
                ref={answerInputRef}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={loading || Boolean(feedback)}
                data-testid="wordbook-quiz-answer"
                aria-label="정답"
                placeholder={mode === "MEANING" ? "뜻 입력" : "단어 입력"}
                maxLength={120}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className="min-w-[240px] flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                data-testid="wordbook-quiz-submit"
                disabled={loading || (!feedback && !answer.trim())}
                className="ui-btn-accent px-4 py-2 text-sm disabled:opacity-60"
              >
                {feedback ? "다음 (Enter)" : "제출"}
              </button>
              {!feedback ? (
                <button
                  type="button"
                  onClick={() => {
                    if (loading) return;
                    void loadNext();
                    setMessage("문제를 건너뛰었습니다.");
                  }}
                  disabled={loading || !item}
                  className="ui-btn-secondary px-4 py-2 text-sm"
                >
                  건너뛰기
                </button>
              ) : null}
            </form>
            <p className="mt-1 text-xs text-slate-500">
              {mode === "MEANING" ? "영단어를 보고 뜻을 입력합니다." : "뜻을 보고 영단어를 입력합니다. 대소문자와 앞뒤 공백은 채점 시 정규화됩니다."}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500" role="status" aria-live="polite">
              <span>시도 {attempts}</span>
              <span>· 정답 {corrects}</span>
              <span>· 오답 {wrongs}</span>
              <span>· 현재 파트 고유 풀이 {solvedInPart}/{partItemCount}</span>
              <span>· 현재 파트 시도 {partAttempts}</span>
              <span>· 현재 파트 남은 문제 {remainingInPart}</span>
            </div>
            {feedback ? (
              <div
                className={[
                  "mt-3 rounded-xl border px-3 py-2 text-sm font-semibold",
                  feedback.isCorrect
                    ? "border-green-300 bg-green-50 text-green-800"
                    : "border-red-300 bg-red-50 text-red-800"
                ].join(" ")}
              >
                <p>{feedback.isCorrect ? "정답" : "오답"}</p>
                {!feedback.isCorrect && feedback.correctAnswer ? (
                  <p className="mt-1 text-xs font-medium text-red-700">
                    정답: {feedback.correctAnswer.term}
                    {mode === "MEANING"
                      ? ` / ${sanitizeUserText(feedback.correctAnswer.meaning, "의미 데이터 점검 중입니다")}`
                      : ""}
                  </p>
                ) : null}
                {!feedback.isCorrect && acceptedMeaningPreview.length ? (
                  <p className="mt-1 text-xs font-medium text-red-700">
                    허용 답안 예: {acceptedMeaningPreview.join(", ")}
                  </p>
                ) : null}
                {!feedback.isCorrect && feedback.gradingDiagnosis ? (
                  <p className="mt-1 text-xs font-medium text-red-700">
                    채점 근거: 입력 정규화 {sanitizeUserText(feedback.gradingDiagnosis.normalizedInput || "-", "-")}
                    {" / "}가장 가까운 허용 답안 {sanitizeUserText(feedback.gradingDiagnosis.closestAccepted || "-", "-")}
                    {" / "}유사도 {(feedback.gradingDiagnosis.similarityScore * 100).toFixed(1)}%
                  </p>
                ) : null}
                {!feedback.isCorrect && feedback.gradingDiagnosis?.potentiallyDisputable ? (
                  <p className="mt-1 text-xs font-semibold text-amber-700">
                    재검토 후보: {feedback.gradingDiagnosis.reason}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void loadNext()}
                    className="ui-btn-primary px-3 py-1.5 text-xs"
                  >
                    다음
                  </button>
                </div>
              </div>
            ) : null}
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
          title="퀴즈 세션 요약"
          summary={`총 ${attempts}문제 중 정답 ${corrects}, 오답 ${wrongs}. 지금 바로 다음 단계로 넘어가 학습 루프를 이어가세요.`}
          suggestion={recommendation}
          secondaryHref={`/wordbooks/${wordbookId}/list-half` as Route}
          secondaryLabel="회복 목록 보기"
        />
      ) : null}
    </section>
  );
}
