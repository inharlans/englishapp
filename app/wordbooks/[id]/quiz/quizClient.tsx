"use client";

import { apiFetch } from "@/lib/clientApi";

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

type SubmitPayload = {
  correct?: boolean;
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
  error?: string;
};

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
  const [retryQueue, setRetryQueue] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [corrects, setCorrects] = useState(0);
  const [wrongs, setWrongs] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [partItemCount, setPartItemCount] = useState(0);
  const answerInputRef = useRef<HTMLInputElement>(null);
  const { mode: meaningMode, setMode: setMeaningMode } = useMeaningViewMode();
  const { mode: densityMode, setMode: setDensityMode } = useDensityMode();
  const { partSize, setPartSize, partIndex, setPartIndex, partCount } = useWordbookParting(wordbookId, totalItems);

  const loadNext = useCallback(async () => {
    if (retryQueue.length > 0) {
      const [next, ...rest] = retryQueue;
      setRetryQueue(rest);
      setItem(next);
      setLoading(false);
      setMessage("세션 오답 큐에서 재출제했습니다.");
      setAnswer("");
      setFeedback(null);
      return;
    }
    setLoading(true);
    setMessage("");
    setAnswer("");
    setFeedback(null);
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
      if (!res.ok) throw new Error(json.error ?? "문제를 불러오지 못했습니다.");
      setItem(json.item ?? null);
      setTotalItems(json.totalItems ?? 0);
      setPartItemCount(json.partItemCount ?? 0);
    } catch (e) {
      setItem(null);
      setMessage(e instanceof Error ? e.message : "문제를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [mode, partIndex, partSize, retryQueue, wordbookId]);

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  useEffect(() => {
    if (!loading && item && !feedback) {
      answerInputRef.current?.focus();
    }
  }, [feedback, item, loading]);

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
      const res = await apiFetch(`/api/wordbooks/${wordbookId}/quiz/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, mode, answer: answer.trim() })
      });
      const json = (await res.json()) as SubmitPayload;
      if (!res.ok) throw new Error(json.error ?? "제출에 실패했습니다.");
      setAttempts((v) => v + 1);
      if (json.correct) setCorrects((v) => v + 1);
      else setWrongs((v) => v + 1);
      setFeedback({
        isCorrect: Boolean(json.correct),
        correctAnswer: json.correctAnswer,
        acceptedMeaningAnswers: json.acceptedMeaningAnswers,
        gradingDiagnosis: json.gradingDiagnosis
      });
      if (!json.correct && item) {
        setRetryQueue((prev) => {
          if (prev.some((queued) => queued.id === item.id) || prev.length >= 20) return prev;
          return [...prev, item];
        });
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "제출에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const retryCurrentItem = () => {
    setFeedback(null);
    setAnswer("");
    setMessage("");
    answerInputRef.current?.focus();
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
  const accuracy = attempts > 0 ? Math.round((corrects / attempts) * 100) : 0;
  const currentPartProgress = partItemCount > 0 ? Math.min(100, Math.round(((corrects + wrongs) / partItemCount) * 100)) : 0;

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
          <label className="font-semibold text-slate-700">파트 크기(n)</label>
          <input
            type="number"
            min={1}
            max={200}
            value={partSize}
            onChange={(e) => setPartSize(Number(e.target.value))}
            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          />
          <span className="text-slate-500">
            총 {totalItems}개 / {partCount}개 파트
          </span>
          <span className="text-slate-500">
            · 정답률 {accuracy}% ({corrects}/{Math.max(attempts, 1)})
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="wordbook-quiz-part-select">
            파트 선택
          </label>
          <select
            id="wordbook-quiz-part-select"
            value={partIndex}
            onChange={(e) => {
              setPartIndex(Number(e.target.value));
              setFeedback(null);
              setMessage("");
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:hidden"
          >
            {partButtons.map((n) => (
              <option key={`part-select-${n}`} value={n}>
                {n}파트
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 hidden flex-wrap gap-2 sm:flex">
          {partButtons.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setPartIndex(n);
                setFeedback(null);
                setMessage("");
              }}
              className={[
                "rounded-lg border px-3 py-1 text-xs font-semibold",
                n === partIndex
                  ? "ui-tab-active"
                  : "ui-tab-inactive"
              ].join(" ")}
            >
              {n}파트
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
            <p className="text-sm text-slate-600">불러오는 중...</p>
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
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100" aria-label={`파트 진행률 ${currentPartProgress}%`}>
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${currentPartProgress}%` }} />
            </div>
            <div className="mt-2 text-3xl font-black tracking-tight text-slate-900">
              {mode === "MEANING" ? item.term : <MeaningView value={item.meaning} mode={meaningMode} />}
            </div>
            {item.example ? (
              <p className="mt-2 text-sm text-slate-500">
                예문: {item.example}
                {item.exampleMeaning ? ` - ${item.exampleMeaning}` : ""}
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
                data-testid="wordbook-quiz-answer"
                aria-label="정답"
                placeholder={mode === "MEANING" ? "뜻 입력" : "단어 입력"}
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
                  onClick={() => void loadNext()}
                  className="ui-btn-secondary px-4 py-2 text-sm"
                >
                  건너뛰기
                </button>
              ) : null}
            </form>
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
                    정답: {feedback.correctAnswer.term} /{" "}
                    {sanitizeUserText(feedback.correctAnswer.meaning, "의미 데이터 점검 중입니다")}
                  </p>
                ) : null}
                {!feedback.isCorrect && mode === "MEANING" && feedback.acceptedMeaningAnswers?.length ? (
                  <p className="mt-1 text-xs font-medium text-red-700">
                    허용 답안 예: {feedback.acceptedMeaningAnswers.slice(0, 4).join(", ")}
                  </p>
                ) : null}
                {!feedback.isCorrect && feedback.gradingDiagnosis ? (
                  <p className="mt-1 text-xs font-medium text-red-700">
                    채점 근거: 입력 정규화 `{feedback.gradingDiagnosis.normalizedInput || "-"}`
                    {" / "}가장 가까운 허용 답안 `{feedback.gradingDiagnosis.closestAccepted || "-"}`
                    {" / "}유사도 {(feedback.gradingDiagnosis.similarityScore * 100).toFixed(1)}%
                  </p>
                ) : null}
                {!feedback.isCorrect && feedback.gradingDiagnosis?.potentiallyDisputable ? (
                  <p className="mt-1 text-xs font-semibold text-amber-700">
                    재검토 후보: {feedback.gradingDiagnosis.reason}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {!feedback.isCorrect ? (
                    <button
                      type="button"
                      onClick={retryCurrentItem}
                      className="ui-btn-primary px-3 py-1.5 text-xs"
                    >
                      다시 풀기
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void loadNext()}
                    className="ui-btn-primary px-3 py-1.5 text-xs"
                  >
                    다음 {retryQueue.length > 0 ? `(오답 큐 ${retryQueue.length})` : ""}
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
