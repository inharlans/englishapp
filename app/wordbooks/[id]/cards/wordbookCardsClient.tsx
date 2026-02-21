"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "@/lib/clientApi";
import { sanitizeUserText } from "@/lib/textQuality";
import { SpeakButton } from "@/components/wordbooks/SpeakButton";
import { WordbookStudyTabs } from "@/components/wordbooks/WordbookStudyTabs";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";

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
  const [info, setInfo] = useState("");
  const [idx, setIdx] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [orderSeed, setOrderSeed] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setError("");
      setInfo("");
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
          const res = await apiFetch(`/api/wordbooks/${wordbookId}/study?view=memorize&page=${page}&take=${take}`, {
            cache: "no-store"
          });
          const json = (await res.json()) as StudyPayload;
          if (!res.ok) {
            throw new Error(json.error ?? "카드 데이터를 불러오지 못했습니다.");
          }
          if (json.items?.length) merged.push(...json.items);
        }

        if (!mountedRef.current) return;
        setTitle(first.wordbook.title);
        setSpeakLang(first.wordbook.fromLang?.toLowerCase().startsWith("en") ? "en-US" : undefined);
        setItems(merged);
        setIdx(0);
        setShowMeaning(false);
        setInfo(`카드 ${merged.length}개를 불러왔습니다.`);
      } catch (e) {
        if (!mountedRef.current) return;
        setItems([]);
        setError(e instanceof Error ? e.message : "카드 데이터를 불러오지 못했습니다.");
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    void loadAll();
  }, [wordbookId]);

  const shuffledItems = useMemo(() => {
    void orderSeed;
    return shuffle(items);
  }, [items, orderSeed]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (loading || shuffledItems.length === 0) return;
      const target = event.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.getAttribute("contenteditable") === "true");
      if (isTyping) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setShowMeaning(false);
        setIdx((v) => Math.max(v - 1, 0));
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setShowMeaning(false);
        setIdx((v) => Math.min(v + 1, Math.max(shuffledItems.length - 1, 0)));
      }
      if (event.key === " ") {
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
  }, [loading, shuffledItems.length]);

  const current = shuffledItems[idx] ?? null;
  const progressPercent = shuffledItems.length > 0 ? Math.round(((idx + 1) / shuffledItems.length) * 100) : 0;

  const next = () => {
    setShowMeaning(false);
    setIdx((v) => Math.min(v + 1, Math.max(shuffledItems.length - 1, 0)));
  };

  const prev = () => {
    setShowMeaning(false);
    setIdx((v) => Math.max(v - 1, 0));
  };

  return (
    <section className="space-y-6" aria-labelledby="wordbook-cards-title">
      <header className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">카드 학습</p>
          <h1 id="wordbook-cards-title" className="mt-2 text-3xl font-black tracking-tight text-slate-900">{title || "단어장"}</h1>
          <p className="mt-2 text-sm text-slate-600">단어 {loading ? "-" : shuffledItems.length}개 | {loading ? "-" : `${idx + 1}/${Math.max(shuffledItems.length, 1)}`}</p>
          <p className="mt-1 text-xs text-slate-500">단축키: ←/→ 카드 이동 · Space 뜻 보기/숨기기 · R 섞기</p>
        </div>
        <WordbookStudyTabs wordbookId={wordbookId} active="cards" showBack={false} />
      </header>

      <div className="ui-card p-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>진행률</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`카드 진행률 ${progressPercent}%`}>
          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-600" role="status" aria-live="polite">불러오는 중...</p> : null}
      {error ? <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700" role="alert">{error}</p> : null}
      {info ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status" aria-live="polite">{info}</p> : null}

      {!loading && !current ? (
        <EmptyStateCard
          title="카드로 학습할 단어가 없습니다"
          description="이 단어장의 단어가 비어 있거나 현재 학습 대상이 없습니다."
          primary={{ label: "단어장 상세로 이동", href: `/wordbooks/${wordbookId}` }}
          secondary={{ label: "암기 화면으로 이동", href: `/wordbooks/${wordbookId}/memorize` }}
        />
      ) : null}

      {current ? (
        <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.7)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">카드</p>
            <div className="flex items-center gap-2">
              <SpeakButton text={current.term} lang={speakLang} />
              <button
                type="button"
                onClick={() => {
                  setOrderSeed((v) => v + 1);
                  setIdx(0);
                  setShowMeaning(false);
                  setInfo("카드 순서를 다시 섞었습니다.");
                }}
                className="ui-btn-secondary px-3 py-2 text-xs"
                disabled={shuffledItems.length === 0}
              >
                섞기
              </button>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-4xl font-black tracking-tight text-slate-900">{current.term}</p>
            {current.pronunciation ? <p className="mt-2 text-sm text-slate-500">[{current.pronunciation}]</p> : null}
          </div>

          <div className="mt-6">
            {showMeaning ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">뜻</p>
                <p className="mt-2 text-xl font-bold text-slate-900">{sanitizeUserText(current.meaning, "의미 데이터 점검 중입니다")}</p>
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
              onClick={prev}
              disabled={idx <= 0}
              aria-label={`이전 카드 (${Math.max(idx, 0)}/${shuffledItems.length})`}
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
              disabled={idx >= shuffledItems.length - 1}
              aria-label={`다음 카드 (${Math.min(idx + 2, shuffledItems.length)}/${shuffledItems.length})`}
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
