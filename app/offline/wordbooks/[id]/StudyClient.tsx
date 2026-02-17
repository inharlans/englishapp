"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getOfflineWordbook, type OfflineWordbook } from "@/lib/offlineWordbooks";
import { SpeakButton } from "@/components/wordbooks/SpeakButton";

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
  const [idx, setIdx] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [orderSeed, setOrderSeed] = useState(0);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        if (!Number.isFinite(id) || id <= 0) throw new Error("잘못된 ID입니다.");
        const found = await getOfflineWordbook(Math.floor(id));
        if (!found) throw new Error("오프라인 라이브러리에서 찾을 수 없습니다.");
        setWb(found);
        setIdx(0);
        setShowMeaning(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "불러오기에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [id]);

  const items = useMemo(() => {
    if (!wb) return [];
    // orderSeed is used to force reshuffle without mutating stored data.
    void orderSeed;
    return shuffle(wb.items);
  }, [wb, orderSeed]);

  const current = items[idx] ?? null;
  const speakLang = wb?.fromLang?.toLowerCase().startsWith("en") ? "en-US" : undefined;

  const next = () => {
    setShowMeaning(false);
    setIdx((v) => Math.min(v + 1, Math.max(items.length - 1, 0)));
  };
  const prev = () => {
    setShowMeaning(false);
    setIdx((v) => Math.max(v - 1, 0));
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">오프라인</p>
          <h1 className="mt-2 truncate text-3xl font-black tracking-tight text-slate-900">
            {wb ? wb.title : "학습"}
          </h1>
          {wb ? (
            <p className="mt-2 text-sm text-slate-600">
              단어 {items.length}개 | {idx + 1}/{Math.max(items.length, 1)}
            </p>
          ) : null}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link
            href={{ pathname: "/offline" }}
            className="ui-btn-secondary px-4 py-2 text-sm"
          >
            뒤로
          </Link>
          <button
            type="button"
            onClick={() => setOrderSeed((v) => v + 1)}
            className="ui-btn-secondary px-4 py-2 text-sm"
            disabled={!wb || items.length === 0}
          >
            섞기
          </button>
        </div>
      </header>

      {loading ? <p className="text-sm text-slate-600">불러오는 중...</p> : null}
      {error ? (
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          {error}
        </p>
      ) : null}

      {wb && current ? (
        <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.7)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              카드
            </p>
            <SpeakButton text={current.term} lang={speakLang} />
          </div>

          <div className="mt-5">
            <p className="text-4xl font-black tracking-tight text-slate-900">{current.term}</p>
            {current.pronunciation ? (
              <p className="mt-2 text-sm text-slate-500">[{current.pronunciation}]</p>
            ) : null}
          </div>

          <div className="mt-6">
            {showMeaning ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  뜻
                </p>
                <p className="mt-2 text-xl font-bold text-slate-900">{current.meaning}</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMeaning(true)}
                className="ui-btn-secondary w-full px-4 py-4 text-left text-sm"
              >
                눌러서 뜻 보기
              </button>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={prev}
              disabled={idx <= 0}
              className="ui-btn-secondary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              이전
            </button>
            <button
              type="button"
              onClick={() => setShowMeaning((v) => !v)}
              className="ui-btn-secondary px-4 py-2 text-sm"
            >
              {showMeaning ? "숨기기" : "보기"}
            </button>
            <button
              type="button"
              onClick={next}
              disabled={idx >= items.length - 1}
              className="ui-btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              다음
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}



