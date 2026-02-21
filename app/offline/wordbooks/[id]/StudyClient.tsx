"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MeaningView } from "@/components/MeaningView";
import { getOfflineWordbook, type OfflineWordbook } from "@/lib/offlineWordbooks";
import { SpeakButton } from "@/components/wordbooks/SpeakButton";
import { sanitizeUserText } from "@/lib/textQuality";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function StudyClient({ id }: { id: number }) {
  const [wb, setWb] = useState<OfflineWordbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [idx, setIdx] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [orderSeed, setOrderSeed] = useState(0);
  const progressStorageKey = `offline_wordbook_progress_${id}`;

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      setInfo("");
      try {
        if (!Number.isFinite(id) || id <= 0) throw new Error("잘못된 ID입니다.");
        const found = await getOfflineWordbook(Math.floor(id));
        if (!found) throw new Error("오프라인 라이브러리에서 찾을 수 없습니다.");
        setWb(found);
        let restored = 0;
        try {
          const raw = window.localStorage.getItem(progressStorageKey);
          const parsed = Number(raw);
          if (Number.isFinite(parsed) && parsed >= 0) {
            restored = Math.floor(parsed);
          }
        } catch {
          restored = 0;
        }
        setIdx(Math.min(restored, Math.max(found.items.length - 1, 0)));
        setShowMeaning(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "불러오기에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [id, progressStorageKey]);

  const items = useMemo(() => {
    if (!wb) return [];
    // Keep stable source order by default; reshuffle only when user requests it.
    if (orderSeed === 0) return wb.items;
    return shuffle(wb.items);
  }, [wb, orderSeed]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (loading || !wb || items.length === 0) return;
      if (event.key === "Home" || event.key === "0") {
        event.preventDefault();
        setShowMeaning(false);
        setIdx(0);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        setShowMeaning(false);
        setIdx(Math.max(items.length - 1, 0));
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setShowMeaning(false);
        setIdx((v) => Math.min(v + 1, Math.max(items.length - 1, 0)));
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setShowMeaning(false);
        setIdx((v) => Math.max(v - 1, 0));
      }
      if (event.key === " ") {
        event.preventDefault();
        setShowMeaning((v) => !v);
      }
      if (event.key === "Enter" || event.key.toLowerCase() === "m") {
        event.preventDefault();
        setShowMeaning((v) => !v);
      }
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        setOrderSeed((v) => v + 1);
        setIdx(0);
        setShowMeaning(false);
        setInfo("카드 순서를 다시 섞었습니다.");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [items.length, loading, wb]);

  useEffect(() => {
    if (!info) return;
    const timeout = window.setTimeout(() => setInfo(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [info]);

  useEffect(() => {
    try {
      window.localStorage.setItem(progressStorageKey, String(idx));
    } catch {
      // ignore localStorage errors
    }
  }, [idx, progressStorageKey]);

  const current = items[idx] ?? null;
  const speakLang = wb?.fromLang?.toLowerCase().startsWith("en") ? "en-US" : undefined;
  const progressPercent = items.length > 0 ? Math.round(((idx + 1) / items.length) * 100) : 0;

  const next = () => {
    setShowMeaning(false);
    setIdx((v) => Math.min(v + 1, Math.max(items.length - 1, 0)));
  };
  const prev = () => {
    setShowMeaning(false);
    setIdx((v) => Math.max(v - 1, 0));
  };

  return (
    <section className="space-y-6" aria-labelledby="offline-study-title">
      <header className="flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">오프라인</p>
          <h1 id="offline-study-title" className="mt-2 truncate text-3xl font-black tracking-tight text-slate-900">
            {wb ? sanitizeUserText(wb.title, "학습") : "학습"}
          </h1>
          {wb ? (
            <p className="mt-2 text-sm text-slate-600">
              단어 {items.length}개 | {idx + 1}/{Math.max(items.length, 1)}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-slate-500">단축키: ←/→ 카드 이동 · Space/Enter/M 뜻 보기 · Home/End/0 처음·끝 카드 · R 섞기</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link href={{ pathname: "/offline" }} className="ui-btn-secondary px-4 py-2 text-sm">
            뒤로
          </Link>
          <button
            type="button"
            onClick={() => {
              setOrderSeed((v) => v + 1);
              setIdx(0);
              setShowMeaning(false);
              setInfo("카드 순서를 다시 섞었습니다.");
            }}
            className="ui-btn-secondary px-4 py-2 text-sm"
            disabled={!wb || items.length === 0}
          >
            섞기
          </button>
        </div>
      </header>

      {loading ? <p className="text-sm text-slate-600" role="status" aria-live="polite">불러오는 중...</p> : null}
      {error ? (
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700" role="alert">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status" aria-live="polite">
          {info}
        </p>
      ) : null}

      {wb && items.length === 0 && !loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600" role="status" aria-live="polite">
          이 오프라인 단어장에는 학습할 단어가 없습니다. <Link href={{ pathname: `/wordbooks/${id}` }} className="font-semibold text-blue-700 hover:underline">온라인 원본에서 단어를 확인</Link>해 주세요.
        </div>
      ) : null}

      {wb && current ? (
        <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.7)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">카드</p>
            <SpeakButton text={current.term} lang={speakLang} />
          </div>

          <div
            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-label={`학습 진행률 ${progressPercent}%`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
          >
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="mt-5">
            <p className="text-4xl font-black tracking-tight text-slate-900">{current.term}</p>
            {current.pronunciation ? <p className="mt-2 text-sm text-slate-500">[{current.pronunciation}]</p> : null}
          </div>

          <div className="mt-6">
            {showMeaning ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">뜻</p>
                <MeaningView
                  value={sanitizeUserText(current.meaning, "의미 데이터 점검 중입니다")}
                  mode="detailed"
                  className="mt-2 text-base font-semibold text-slate-900"
                />
                <div className="mt-3">
                  <Link href={{ pathname: `/wordbooks/${id}` }} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100">
                    온라인 원본에서 동기화하기
                  </Link>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setShowMeaning(true)} className="ui-btn-secondary w-full px-4 py-4 text-left text-sm">
                눌러서 뜻 보기
              </button>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setIdx(0);
                setShowMeaning(false);
              }}
              disabled={idx <= 0}
              aria-label="첫 카드로 이동"
              className="ui-btn-secondary px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              처음
            </button>
            <button
              type="button"
              onClick={prev}
              disabled={idx <= 0}
              aria-label={`이전 카드 (${Math.max(idx, 1)}/${items.length})`}
              className="ui-btn-secondary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              이전
            </button>
            <button type="button" onClick={() => setShowMeaning((v) => !v)} className="ui-btn-secondary px-4 py-2 text-sm">
              {showMeaning ? "숨기기" : "보기"}
            </button>
            <button
              type="button"
              onClick={next}
              disabled={idx >= items.length - 1}
              aria-label={`다음 카드 (${Math.min(idx + 2, items.length)}/${items.length})`}
              className="ui-btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              다음
            </button>
            <button
              type="button"
              onClick={() => {
                setIdx(Math.max(items.length - 1, 0));
                setShowMeaning(false);
              }}
              disabled={idx >= items.length - 1}
              aria-label="마지막 카드로 이동"
              className="ui-btn-secondary px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              마지막
            </button>
          </div>

          {idx >= items.length - 1 ? (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIdx(0);
                  setShowMeaning(false);
                  setInfo("처음 카드로 돌아왔습니다.");
                }}
                className="ui-btn-secondary px-3 py-1.5 text-xs"
              >
                처음부터 다시
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
