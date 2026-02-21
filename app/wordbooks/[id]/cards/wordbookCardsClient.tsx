"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "@/lib/clientApi";
import { sanitizeUserText } from "@/lib/textQuality";
import { SpeakButton } from "@/components/wordbooks/SpeakButton";
import { WordbookStudyTabs } from "@/components/wordbooks/WordbookStudyTabs";
import { useWordbookParting } from "@/components/wordbooks/useWordbookParting";
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
  const [partJump, setPartJump] = useState("1");
  const [reloadTick, setReloadTick] = useState(0);
  const mountedRef = useRef(true);
  const requestSeqRef = useRef(0);
  const { partSize, setPartSize, partIndex, setPartIndex, partCount } = useWordbookParting(wordbookId, items.length);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      const requestSeq = requestSeqRef.current + 1;
      requestSeqRef.current = requestSeq;
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
        if (pageCount > 1) {
          const pagePromises = Array.from({ length: pageCount - 1 }, (_, idx) =>
            apiFetch(`/api/wordbooks/${wordbookId}/study?view=memorize&page=${idx + 1}&take=${take}`, { cache: "no-store" })
          );
          const pageResponses = await Promise.all(pagePromises);
          const pagePayloads = await Promise.all(pageResponses.map(async (res) => ({ ok: res.ok, json: (await res.json()) as StudyPayload })));
          for (const payload of pagePayloads) {
            if (!payload.ok) throw new Error(payload.json.error ?? "카드 데이터를 불러오지 못했습니다.");
            if (payload.json.items?.length) merged.push(...payload.json.items);
          }
        }

        if (!mountedRef.current || requestSeqRef.current !== requestSeq) return;
        setTitle(first.wordbook.title);
        setSpeakLang(first.wordbook.fromLang?.toLowerCase().startsWith("en") ? "en-US" : undefined);
        setItems(merged);
        setIdx(0);
        setShowMeaning(false);
        setInfo(`카드 ${merged.length}개를 불러왔습니다.`);
      } catch (e) {
        if (!mountedRef.current || requestSeqRef.current !== requestSeq) return;
        setItems([]);
        setError(e instanceof Error ? e.message : "카드 데이터를 불러오지 못했습니다.");
      } finally {
        if (mountedRef.current && requestSeqRef.current === requestSeq) setLoading(false);
      }
    };

    void loadAll();
  }, [reloadTick, wordbookId]);

  const partItems = useMemo(() => {
    const start = (partIndex - 1) * partSize;
    return items.slice(start, start + partSize);
  }, [items, partIndex, partSize]);

  const shuffledItems = useMemo(() => {
    void orderSeed;
    return shuffle(partItems);
  }, [partItems, orderSeed]);
  const partStart = (partIndex - 1) * partSize + 1;
  const partEnd = Math.min(partIndex * partSize, items.length);
  const overallProgressPercent = items.length > 0 ? Math.round((((partIndex - 1) * partSize + (idx + 1)) / items.length) * 100) : 0;
  const visiblePartButtons = useMemo(() => {
    if (partCount <= 9) return Array.from({ length: partCount }, (_, i) => ({ kind: "part" as const, value: i + 1 }));
    const set = new Set<number>([1, partCount]);
    for (let n = partIndex - 2; n <= partIndex + 2; n += 1) {
      if (n >= 1 && n <= partCount) set.add(n);
    }
    const sorted = Array.from(set).sort((a, b) => a - b);
    const result: Array<{ kind: "part"; value: number } | { kind: "ellipsis"; id: string }> = [];
    for (let i = 0; i < sorted.length; i += 1) {
      const current = sorted[i];
      const prev = sorted[i - 1];
      if (prev && current - prev > 1) result.push({ kind: "ellipsis", id: `ellipsis-${prev}-${current}` });
      result.push({ kind: "part", value: current });
    }
    return result;
  }, [partCount, partIndex]);

  useEffect(() => {
    setPartJump(String(partIndex));
  }, [partIndex]);

  useEffect(() => {
    setIdx(0);
    setShowMeaning(false);
    setInfo("");
  }, [partIndex, partSize]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.getAttribute("contenteditable") === "true");
      if (isTyping) return;

      if (event.key === "[") {
        event.preventDefault();
        setPartIndex(Math.max(1, partIndex - 1));
        return;
      }
      if (event.key === "]") {
        event.preventDefault();
        setPartIndex(Math.min(partCount, partIndex + 1));
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        setIdx(0);
        setShowMeaning(false);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        setIdx(Math.max(shuffledItems.length - 1, 0));
        setShowMeaning(false);
        return;
      }
      if (event.key === "PageUp") {
        event.preventDefault();
        setPartIndex(Math.max(1, partIndex - 1));
        return;
      }
      if (event.key === "PageDown") {
        event.preventDefault();
        setPartIndex(Math.min(partCount, partIndex + 1));
        return;
      }
      if (loading || shuffledItems.length === 0) return;

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
  }, [loading, partCount, partIndex, setPartIndex, shuffledItems.length]);

  useEffect(() => {
    setIdx((value) => Math.min(value, Math.max(shuffledItems.length - 1, 0)));
  }, [shuffledItems.length]);

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
          <p className="mt-2 text-sm text-slate-600">
            파트 {partIndex}/{partCount} · 파트 단어 {loading ? "-" : shuffledItems.length}개 ·{" "}
            {loading ? "-" : `${idx + 1}/${Math.max(shuffledItems.length, 1)}`}
          </p>
          <p className="mt-1 text-xs text-slate-500">단축키: ←/→ 카드 이동 · Space 뜻 보기/숨기기 · R 섞기 · `[`/`]` 파트 이동 · Home/End 처음/끝 카드 · PageUp/PageDown 파트 이동</p>
        </div>
        <WordbookStudyTabs wordbookId={wordbookId} active="cards" showBack={false} />
      </header>

      <div className="ui-card p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="font-semibold text-slate-700" htmlFor="cards-part-size">
            파트 크기(n)
          </label>
          <input
            id="cards-part-size"
            type="number"
            min={1}
            max={200}
            value={partSize}
            onChange={(event) => setPartSize(Number(event.target.value))}
            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          />
          <span className="text-slate-500">전체 {items.length}개 / {partCount}개 파트</span>
          <span className="text-slate-500">· 현재 범위 {items.length === 0 ? "-" : `${partStart}~${partEnd}`}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="cards-part-select">
            파트 선택
          </label>
          <select
            id="cards-part-select"
            value={partIndex}
            onChange={(event) => setPartIndex(Number(event.target.value))}
            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm sm:hidden"
          >
            {Array.from({ length: partCount }, (_, i) => i + 1).map((n) => (
              <option key={`cards-part-${n}`} value={n}>
                {n}파트
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setPartIndex(Math.max(1, partIndex - 1))}
            disabled={partIndex <= 1}
            className="ui-btn-secondary px-3 py-1 text-xs disabled:opacity-50"
            aria-label={`${Math.max(1, partIndex - 1)}파트로 이동`}
          >
            이전 파트
          </button>
          <button
            type="button"
            onClick={() => setPartIndex(Math.min(partCount, partIndex + 1))}
            disabled={partIndex >= partCount}
            className="ui-btn-secondary px-3 py-1 text-xs disabled:opacity-50"
            aria-label={`${Math.min(partCount, partIndex + 1)}파트로 이동`}
          >
            다음 파트
          </button>
          <form
            className="flex w-full items-center gap-2 sm:w-auto"
            onSubmit={(event) => {
              event.preventDefault();
              const raw = Number(partJump);
              const next = Number.isFinite(raw) ? Math.min(Math.max(Math.floor(raw), 1), partCount) : partIndex;
              setPartJump(String(next));
              setPartIndex(next);
            }}
          >
            <label htmlFor="cards-part-jump" className="sr-only">
              이동할 파트 번호
            </label>
            <input
              id="cards-part-jump"
              type="number"
              min={1}
              max={partCount}
              value={partJump}
              onChange={(event) => setPartJump(event.target.value)}
              onBlur={() => {
                const raw = Number(partJump);
                if (!Number.isFinite(raw)) {
                  setPartJump(String(partIndex));
                  return;
                }
                setPartJump(String(Math.min(Math.max(Math.floor(raw), 1), partCount)));
              }}
              className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm sm:w-24"
            />
            <button type="submit" className="ui-btn-secondary px-3 py-1 text-xs">
              이동
            </button>
          </form>
        </div>
        <div className="mt-2 hidden flex-wrap gap-2 sm:flex">
          {visiblePartButtons.map((entry) =>
            entry.kind === "ellipsis" ? (
              <span key={entry.id} className="px-2 py-1 text-xs font-semibold text-slate-400" aria-hidden="true">
                ...
              </span>
            ) : (
              <button
                key={entry.value}
                type="button"
                onClick={() => setPartIndex(entry.value)}
                className={[
                  "rounded-lg border px-3 py-1 text-xs font-semibold",
                  entry.value === partIndex ? "ui-tab-active" : "ui-tab-inactive"
                ].join(" ")}
                aria-label={`${entry.value}파트 ${entry.value === partIndex ? "선택됨" : "선택"}`}
              >
                {entry.value}파트
              </button>
            )
          )}
        </div>
      </div>

      <div className="ui-card p-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>파트 진행률</span>
          <span>{progressPercent}%</span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label={`카드 진행률 ${progressPercent}%`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
        >
          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>전체 진행률</span>
          <span>{overallProgressPercent}%</span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label={`전체 카드 진행률 ${overallProgressPercent}%`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={overallProgressPercent}
        >
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600" style={{ width: `${overallProgressPercent}%` }} />
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-600" role="status" aria-live="polite">불러오는 중...</p> : null}
      {error ? <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700" role="alert">{error}</p> : null}
      {info ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status" aria-live="polite">{info}</p> : null}

      {!loading && !current ? (
        <EmptyStateCard
          title="카드로 학습할 단어가 없습니다"
          description="현재 파트에 카드가 없습니다. 다른 파트를 선택하거나 파트 크기를 조정해보세요."
          primary={{ label: "단어장 상세로 이동", href: `/wordbooks/${wordbookId}?partSize=${partSize}&partIndex=${partIndex}` }}
          secondary={{ label: "암기 화면으로 이동", href: `/wordbooks/${wordbookId}/memorize?partSize=${partSize}&partIndex=${partIndex}` }}
        />
      ) : null}
      {error ? (
        <div>
          <button
            type="button"
            onClick={() => {
              setInfo("");
              setError("");
              setReloadTick((value) => value + 1);
            }}
            className="ui-btn-secondary px-3 py-1 text-xs"
          >
            다시 시도
          </button>
        </div>
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
