"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/clientApi";
import { sanitizeUserText } from "@/lib/textQuality";
import { SpeakButton } from "@/components/wordbooks/SpeakButton";
import { WordbookStudyTabs } from "@/components/wordbooks/WordbookStudyTabs";

type Item = {
  id: number;
  term: string;
  meaning: string;
  pronunciation: string | null;
};

type StudyPayload = {
  error?: string;
  wordbook?: { title: string; fromLang?: string };
  items?: Item[];
  paging?: { totalFiltered: number; take: number };
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function WordbookCardsClient({ wordbookId }: { wordbookId: number }) {
  const [title, setTitle] = useState("");
  const [speakLang, setSpeakLang] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [idx, setIdx] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [orderSeed, setOrderSeed] = useState(0);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setError("");
      try {
        const firstRes = await apiFetch(`/api/wordbooks/${wordbookId}/study?view=memorize&page=0&take=200`, {
          cache: "no-store"
        });
        const first = (await firstRes.json()) as StudyPayload;
        if (!firstRes.ok || !first.wordbook) {
          throw new Error(first.error ?? "카드 데이터를 불러오지 못했습니다.");
        }

        const total = first.paging?.totalFiltered ?? (first.items?.length ?? 0);
        const take = first.paging?.take ?? 200;
        const pageCount = Math.max(1, Math.ceil(total / Math.max(take, 1)));
        const merged = [...(first.items ?? [])];

        for (let page = 1; page < pageCount; page += 1) {
          const res = await apiFetch(
            `/api/wordbooks/${wordbookId}/study?view=memorize&page=${page}&take=${take}`,
            { cache: "no-store" }
          );
          const json = (await res.json()) as StudyPayload;
          if (!res.ok) {
            throw new Error(json.error ?? "카드 데이터를 불러오지 못했습니다.");
          }
          if (json.items?.length) merged.push(...json.items);
        }

        setTitle(first.wordbook.title);
        setSpeakLang(first.wordbook.fromLang?.toLowerCase().startsWith("en") ? "en-US" : undefined);
        setItems(merged);
        setIdx(0);
        setShowMeaning(false);
      } catch (e) {
        setItems([]);
        setError(e instanceof Error ? e.message : "카드 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    void loadAll();
  }, [wordbookId]);

  const shuffledItems = useMemo(() => {
    void orderSeed;
    return shuffle(items);
  }, [items, orderSeed]);

  const current = shuffledItems[idx] ?? null;

  const next = () => {
    setShowMeaning(false);
    setIdx((v) => Math.min(v + 1, Math.max(shuffledItems.length - 1, 0)));
  };

  const prev = () => {
    setShowMeaning(false);
    setIdx((v) => Math.max(v - 1, 0));
  };

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">카드 학습</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{title || "단어장"}</h1>
          <p className="mt-2 text-sm text-slate-600">
            단어 {shuffledItems.length}개 | {idx + 1}/{Math.max(shuffledItems.length, 1)}
          </p>
        </div>
        <WordbookStudyTabs wordbookId={wordbookId} active="cards" showBack={false} />
      </header>

      {loading ? <p className="text-sm text-slate-600">불러오는 중...</p> : null}
      {error ? (
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{error}</p>
      ) : null}

      {current ? (
        <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.7)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">카드</p>
            <div className="flex items-center gap-2">
              <SpeakButton text={current.term} lang={speakLang} />
              <button
                type="button"
                onClick={() => setOrderSeed((v) => v + 1)}
                className="ui-btn-secondary px-3 py-2 text-xs"
                disabled={shuffledItems.length === 0}
              >
                섞기
              </button>
            </div>
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
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">뜻</p>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  {sanitizeUserText(current.meaning, "의미 데이터 점검 중입니다")}
                </p>
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
              disabled={idx >= shuffledItems.length - 1}
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

