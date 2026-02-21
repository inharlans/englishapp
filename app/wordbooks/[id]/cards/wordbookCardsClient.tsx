"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "@/lib/clientApi";
import { sanitizeUserText } from "@/lib/textQuality";
import { MeaningView } from "@/components/MeaningView";
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

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleBySeed<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  const rand = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseBoundedInt(raw: string, fallback: number, min: number, max: number) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
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
  const [resumeEnabled, setResumeEnabled] = useState(true);
  const [autoAdvancePart, setAutoAdvancePart] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [partShuffleSeed, setPartShuffleSeed] = useState(1);
  const mountedRef = useRef(true);
  const requestSeqRef = useRef(0);
  const restoredKeyRef = useRef("");
  const skipInitialPartInfoRef = useRef(true);
  const { partSize, setPartSize, partIndex, setPartIndex, partCount } = useWordbookParting(wordbookId, items.length);
  const progressStorageKey = `wordbook_cards_progress_${wordbookId}_${partSize}_${partIndex}`;
  const resumePrefKey = `wordbook_cards_resume_enabled_${wordbookId}`;
  const autoAdvanceKey = `wordbook_cards_auto_advance_${wordbookId}`;
  const autoSpeakKey = `wordbook_cards_auto_speak_${wordbookId}`;
  const seedStorageKey = `wordbook_cards_seed_${wordbookId}_${partSize}_${partIndex}`;

  useEffect(() => {
    mountedRef.current = true;
    try {
      const raw = window.localStorage.getItem(resumePrefKey);
      if (raw === "0") setResumeEnabled(false);
      const autoAdvanceRaw = window.localStorage.getItem(autoAdvanceKey);
      if (autoAdvanceRaw === "1") setAutoAdvancePart(true);
      const autoSpeakRaw = window.localStorage.getItem(autoSpeakKey);
      if (autoSpeakRaw === "1") setAutoSpeak(true);
    } catch {
      setResumeEnabled(true);
      setAutoAdvancePart(false);
      setAutoSpeak(false);
    }
    return () => {
      mountedRef.current = false;
    };
  }, [autoAdvanceKey, autoSpeakKey, resumePrefKey]);

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
    return shuffleBySeed(partItems, partShuffleSeed);
  }, [partItems, orderSeed, partShuffleSeed]);
  const hasPartItems = shuffledItems.length > 0;
  const partStart = (partIndex - 1) * partSize + 1;
  const partEnd = Math.min(partIndex * partSize, items.length);
  const overallCardNumber = hasPartItems ? (partIndex - 1) * partSize + (idx + 1) : 0;
  const overallProgressPercent =
    items.length > 0 && hasPartItems ? Math.round((overallCardNumber / items.length) * 100) : 0;
  const isPartComplete = hasPartItems && idx >= shuffledItems.length - 1;
  const remainingInPart = Math.max(shuffledItems.length - (idx + 1), 0);
  const remainingParts = Math.max(partCount - partIndex, 0);
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

  const moveToPrevPart = useCallback(() => {
    if (partIndex <= 1) {
      setInfo("첫 파트입니다.");
      return;
    }
    setPartIndex(Math.max(1, partIndex - 1));
  }, [partIndex, setPartIndex]);

  const moveToNextPart = useCallback(() => {
    if (partIndex >= partCount) {
      setInfo("마지막 파트입니다.");
      return;
    }
    setPartIndex(Math.min(partCount, partIndex + 1));
  }, [partCount, partIndex, setPartIndex]);

  const next = useCallback(() => {
    if (idx >= shuffledItems.length - 1) {
      if (autoAdvancePart && partIndex < partCount) {
        moveToNextPart();
        return;
      }
      setInfo("현재 파트의 마지막 카드입니다.");
      return;
    }
    setShowMeaning(false);
    setIdx((v) => Math.min(v + 1, Math.max(shuffledItems.length - 1, 0)));
  }, [autoAdvancePart, idx, moveToNextPart, partCount, partIndex, shuffledItems.length]);

  const prev = useCallback(() => {
    setShowMeaning(false);
    setIdx((v) => Math.max(v - 1, 0));
  }, []);

  useEffect(() => {
    setPartJump(String(partIndex));
    restoredKeyRef.current = "";
  }, [partIndex, partSize]);

  useEffect(() => {
    let seed = 1;
    try {
      const raw = window.localStorage.getItem(seedStorageKey);
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) {
        seed = Math.floor(parsed);
      } else {
        seed = Math.floor(Math.random() * 2_000_000_000) + 1;
        window.localStorage.setItem(seedStorageKey, String(seed));
      }
    } catch {
      seed = Math.floor(Math.random() * 2_000_000_000) + 1;
    }
    setPartShuffleSeed(seed);
  }, [seedStorageKey]);

  useEffect(() => {
    setIdx(0);
    setShowMeaning(false);
    if (skipInitialPartInfoRef.current) {
      skipInitialPartInfoRef.current = false;
      return;
    }
    setInfo(`${partIndex}파트로 이동했습니다.`);
  }, [partIndex, partSize]);

  useEffect(() => {
    if (!info) return;
    const timeout = window.setTimeout(() => setInfo(""), 4500);
    return () => window.clearTimeout(timeout);
  }, [info]);

  useEffect(() => {
    if (!resumeEnabled || loading || shuffledItems.length === 0) return;
    if (restoredKeyRef.current === progressStorageKey) return;
    restoredKeyRef.current = progressStorageKey;
    try {
      const raw = window.localStorage.getItem(progressStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { idx?: number; showMeaning?: boolean; currentItemId?: number };
      const indexByItemId =
        typeof parsed.currentItemId === "number"
          ? shuffledItems.findIndex((card) => card.id === parsed.currentItemId)
          : -1;
      const nextIdx = indexByItemId >= 0
        ? indexByItemId
        : Number.isFinite(parsed.idx) && typeof parsed.idx === "number"
          ? Math.min(Math.max(Math.floor(parsed.idx), 0), Math.max(shuffledItems.length - 1, 0))
          : 0;
      setIdx(nextIdx);
      setShowMeaning(Boolean(parsed.showMeaning));
      setInfo(`${partIndex}파트 이어보기 위치로 복원했습니다.`);
    } catch {
      setIdx(0);
      setShowMeaning(false);
    }
  }, [loading, partIndex, progressStorageKey, resumeEnabled, shuffledItems, shuffledItems.length]);

  useEffect(() => {
    if (!resumeEnabled || !hasPartItems) return;
    try {
      const currentItemId = shuffledItems[idx]?.id ?? null;
      window.localStorage.setItem(
        progressStorageKey,
        JSON.stringify({ idx, showMeaning, currentItemId, updatedAt: Date.now() })
      );
    } catch {
      // ignore localStorage errors
    }
  }, [hasPartItems, idx, progressStorageKey, resumeEnabled, showMeaning, shuffledItems]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.getAttribute("contenteditable") === "true");
      if (isTyping) return;

      if (event.key === "[") {
        event.preventDefault();
        moveToPrevPart();
        return;
      }
      if (event.key === "]") {
        event.preventDefault();
        moveToNextPart();
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
        moveToPrevPart();
        return;
      }
      if (event.key === "PageDown") {
        event.preventDefault();
        moveToNextPart();
        return;
      }
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        moveToNextPart();
        return;
      }
      if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        moveToPrevPart();
        return;
      }
      if (event.key.toLowerCase() === "m" && !loading && shuffledItems.length > 0) {
        event.preventDefault();
        setShowMeaning((value) => !value);
        return;
      }
      if (event.key === "0" && !loading && shuffledItems.length > 0) {
        event.preventDefault();
        setIdx(0);
        setShowMeaning(false);
        setInfo("현재 파트 첫 카드로 이동했습니다.");
        return;
      }
      if (event.key.toLowerCase() === "a") {
        event.preventDefault();
        setAutoAdvancePart((value) => {
          const next = !value;
          try {
            window.localStorage.setItem(autoAdvanceKey, next ? "1" : "0");
          } catch {
            // ignore localStorage errors
          }
          setInfo(`자동 다음 파트 이동: ${next ? "켜짐" : "꺼짐"}`);
          return next;
        });
        return;
      }
      if (event.key.toLowerCase() === "v") {
        event.preventDefault();
        setAutoSpeak((value) => {
          const next = !value;
          try {
            window.localStorage.setItem(autoSpeakKey, next ? "1" : "0");
          } catch {
            // ignore localStorage errors
          }
          setInfo(`자동 발음: ${next ? "켜짐" : "꺼짐"}`);
          return next;
        });
        return;
      }
      if (event.key === "Enter" && !loading && shuffledItems.length > 0) {
        event.preventDefault();
        setShowMeaning((v) => !v);
        return;
      }
      if (event.key === "Escape" && showMeaning) {
        event.preventDefault();
        setShowMeaning(false);
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
        next();
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
  }, [autoAdvanceKey, autoSpeakKey, loading, moveToNextPart, moveToPrevPart, next, showMeaning, shuffledItems.length]);

  useEffect(() => {
    setIdx((value) => Math.min(value, Math.max(shuffledItems.length - 1, 0)));
  }, [shuffledItems.length]);

  const current = shuffledItems[idx] ?? null;
  const progressPercent = shuffledItems.length > 0 ? Math.round(((idx + 1) / shuffledItems.length) * 100) : 0;
  const isInitialLoading = loading && items.length === 0;
  const totalItemsLabel = isInitialLoading ? "-" : String(items.length);
  const partCountLabel = isInitialLoading ? "-" : String(partCount);
  const currentRangeLabel = isInitialLoading || !hasPartItems ? "-" : `${partStart}~${partEnd}`;
  const remainingInPartLabel = isInitialLoading ? "-" : String(remainingInPart);
  const remainingPartsLabel = isInitialLoading ? "-" : String(remainingParts);
  const overallProgressLabel = isInitialLoading ? "-" : `${overallCardNumber}/${items.length}`;

  useEffect(() => {
    if (!autoSpeak || !current) return;
    try {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const utterance = new SpeechSynthesisUtterance(current.term.trim());
      if (speakLang) utterance.lang = speakLang;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore speech errors
    }
  }, [autoSpeak, current, speakLang]);

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
          <p className="mt-1 text-xs text-slate-500">
            단축키: ←/→ 카드 이동 · Space/Enter/M 뜻 보기 · Esc 뜻 숨기기 · 0 처음 카드 · R 섞기 · `[`/`]`/`P`/`N` 파트 이동 · `A` 자동 파트 이동 · `V` 자동 발음 토글 · Home/End 처음/끝 카드 · PageUp/PageDown 파트 이동
          </p>
          <p className="mt-1 text-xs text-slate-500" role="status" aria-live="polite">
            전체 기준 {overallProgressLabel}
          </p>
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
            onChange={(event) => {
              const next = parseBoundedInt(event.target.value, partSize, 1, 200);
              setPartSize(next);
              setPartIndex(1);
              setPartJump("1");
              setInfo(`파트 크기를 ${next}로 변경했습니다.`);
            }}
            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          />
          <span className="text-slate-500">전체 {totalItemsLabel}개 / {partCountLabel}개 파트</span>
          <span className="text-slate-500">· 현재 범위 {currentRangeLabel}</span>
          <span className="text-slate-500">· 남은 카드 {remainingInPartLabel}개</span>
          <span className="text-slate-500">· 남은 파트 {remainingPartsLabel}개</span>
          <button
            type="button"
            onClick={() => {
              setAutoAdvancePart((value) => {
                const next = !value;
                try {
                  window.localStorage.setItem(autoAdvanceKey, next ? "1" : "0");
                } catch {
                  // ignore localStorage errors
                }
                return next;
              });
            }}
            aria-pressed={autoAdvancePart}
            className="ui-btn-secondary px-3 py-1 text-xs"
          >
            자동 다음 파트 {autoAdvancePart ? "켜짐" : "꺼짐"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAutoSpeak((value) => {
                const next = !value;
                try {
                  window.localStorage.setItem(autoSpeakKey, next ? "1" : "0");
                } catch {
                  // ignore localStorage errors
                }
                setInfo(`자동 발음: ${next ? "켜짐" : "꺼짐"}`);
                return next;
              });
            }}
            aria-pressed={autoSpeak}
            className="ui-btn-secondary px-3 py-1 text-xs"
          >
            자동 발음 {autoSpeak ? "켜짐" : "꺼짐"}
          </button>
          <button
            type="button"
            onClick={() => {
              setResumeEnabled((value) => {
                const next = !value;
                try {
                  window.localStorage.setItem(resumePrefKey, next ? "1" : "0");
                } catch {
                  // ignore localStorage errors
                }
                return next;
              });
            }}
            aria-pressed={resumeEnabled}
            className="ui-btn-secondary px-3 py-1 text-xs"
          >
            이어보기 {resumeEnabled ? "켜짐" : "꺼짐"}
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                window.localStorage.removeItem(progressStorageKey);
              } catch {
                // ignore localStorage errors
              }
              setIdx(0);
              setShowMeaning(false);
              setInfo("현재 파트 이어보기 위치를 초기화했습니다.");
            }}
            className="ui-btn-secondary px-3 py-1 text-xs"
          >
            이어보기 초기화
          </button>
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
            onClick={() => {
              if (partIndex <= 1) {
                setInfo("첫 파트입니다.");
                return;
              }
              setPartIndex(1);
            }}
            disabled={loading || partIndex <= 1}
            className="ui-btn-secondary px-3 py-1 text-xs disabled:opacity-50"
            aria-label="첫 파트로 이동"
          >
            처음
          </button>
          <button
            type="button"
            onClick={moveToPrevPart}
            disabled={loading || partIndex <= 1}
            className="ui-btn-secondary px-3 py-1 text-xs disabled:opacity-50"
            aria-label={`${Math.max(1, partIndex - 1)}파트로 이동`}
          >
            이전 파트
          </button>
          <button
            type="button"
            onClick={moveToNextPart}
            disabled={loading || partIndex >= partCount}
            className="ui-btn-secondary px-3 py-1 text-xs disabled:opacity-50"
            aria-label={`${Math.min(partCount, partIndex + 1)}파트로 이동`}
          >
            다음 파트
          </button>
          <button
            type="button"
            onClick={() => {
              if (partIndex >= partCount) {
                setInfo("마지막 파트입니다.");
                return;
              }
              setPartIndex(partCount);
            }}
            disabled={loading || partIndex >= partCount}
            className="ui-btn-secondary px-3 py-1 text-xs disabled:opacity-50"
            aria-label="마지막 파트로 이동"
          >
            마지막
          </button>
          <form
            className="flex w-full items-center gap-2 sm:w-auto"
            onSubmit={(event) => {
              event.preventDefault();
              const next = parseBoundedInt(partJump, partIndex, 1, partCount);
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
                setPartJump(String(parseBoundedInt(partJump, partIndex, 1, partCount)));
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
                onClick={() => {
                  if (loading) return;
                  setPartIndex(entry.value);
                }}
                className={[
                  "rounded-lg border px-3 py-1 text-xs font-semibold",
                  entry.value === partIndex ? "ui-tab-active" : "ui-tab-inactive"
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
      {isPartComplete ? (
        <div className="ui-card p-3" role="status" aria-live="polite">
          <p className="text-sm font-semibold text-slate-800">현재 파트 학습을 완료했습니다.</p>
          <p className="mt-1 text-xs text-slate-500">
            남은 파트 {remainingParts}개 · 자동 다음 파트 {autoAdvancePart ? "켜짐" : "꺼짐"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setOrderSeed((value) => value + 1);
                const nextSeed = Math.floor(Math.random() * 2_000_000_000) + 1;
                setPartShuffleSeed(nextSeed);
                try {
                  window.localStorage.setItem(seedStorageKey, String(nextSeed));
                } catch {
                  // ignore localStorage errors
                }
                setIdx(0);
                setShowMeaning(false);
                setInfo("현재 파트 카드를 다시 섞었습니다.");
              }}
              className="ui-btn-secondary px-3 py-1 text-xs"
            >
              현재 파트 다시 섞기
            </button>
            <button
              type="button"
              onClick={moveToNextPart}
              disabled={loading || partIndex >= partCount}
              className="ui-btn-primary px-3 py-1 text-xs disabled:opacity-50"
            >
              다음 파트로 이동
            </button>
          </div>
        </div>
      ) : null}

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
                  const nextSeed = Math.floor(Math.random() * 2_000_000_000) + 1;
                  setPartShuffleSeed(nextSeed);
                  try {
                    window.localStorage.setItem(seedStorageKey, String(nextSeed));
                  } catch {
                    // ignore localStorage errors
                  }
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
                <MeaningView
                  value={sanitizeUserText(current.meaning, "의미 데이터 점검 중입니다")}
                  mode="detailed"
                  className="mt-2 text-base font-semibold text-slate-900"
                />
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
              aria-label={`이전 카드 (${Math.max(idx, 1)}/${shuffledItems.length})`}
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
            <button
              type="button"
              onClick={() => {
                setIdx(Math.max(shuffledItems.length - 1, 0));
                setShowMeaning(false);
              }}
              disabled={idx >= shuffledItems.length - 1}
              aria-label="마지막 카드로 이동"
              className="ui-btn-secondary px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              마지막
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
