"use client";

import { useEffect, useMemo, useState } from "react";

import { MeaningView } from "@/components/MeaningView";
import { WordbookStudyTabs } from "@/components/wordbooks/WordbookStudyTabs";
import { useMeaningViewMode } from "@/components/wordbooks/useMeaningViewMode";
import { useWordbookParting } from "@/components/wordbooks/useWordbookParting";
import { DensityModeToggle } from "@/components/ui/DensityModeToggle";
import { densityCardClass, useDensityMode } from "@/components/ui/useDensityMode";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import { apiFetch } from "@/lib/clientApi";
import { sanitizeUserText } from "@/lib/textQuality";

type ListMode = "listCorrect" | "listWrong" | "listHalf";

type Item = {
  id: number;
  term: string;
  meaning: string;
  example: string | null;
  exampleMeaning: string | null;
  itemState: {
    status: "NEW" | "CORRECT" | "WRONG";
    everCorrect: boolean;
    everWrong: boolean;
  } | null;
};

type Payload = {
  wordbook?: { title: string };
  items?: Item[];
  error?: string;
  paging?: {
    totalItems: number;
    partCount: number;
    partSize: number | null;
    partIndex: number;
    partStats: Array<{ partIndex: number; totalInPart: number; matchedCount: number }>;
  };
};

function activeTab(mode: ListMode) {
  if (mode === "listCorrect") return "list-correct" as const;
  if (mode === "listWrong") return "list-wrong" as const;
  return "list-half" as const;
}

function parseBoundedInt(raw: string, fallback: number, min: number, max: number) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

export function WordbookListClient({
  wordbookId,
  mode,
  title
}: {
  wordbookId: number;
  mode: ListMode;
  title: string;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [wordbookTitle, setWordbookTitle] = useState("");
  const [totalItems, setTotalItems] = useState(0);
  const [partStats, setPartStats] = useState<Array<{ partIndex: number; totalInPart: number; matchedCount: number }>>(
    []
  );
  const [pagingPartCount, setPagingPartCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [partJump, setPartJump] = useState("1");
  const [reloadTick, setReloadTick] = useState(0);
  const { mode: meaningMode, setMode: setMeaningMode } = useMeaningViewMode();
  const { mode: densityMode, setMode: setDensityMode } = useDensityMode();
  const { partSize, setPartSize, partIndex, setPartIndex, partCount } = useWordbookParting(wordbookId, totalItems);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const qs = new URLSearchParams({
          view: mode,
          page: "0",
          take: String(partSize),
          partSize: String(partSize),
          partIndex: String(partIndex)
        });
        const res = await apiFetch(`/api/wordbooks/${wordbookId}/study?${qs.toString()}`, {
          cache: "no-store"
        });
        const json = (await res.json()) as Payload;
        if (!res.ok) throw new Error(json.error ?? "목록을 불러오지 못했습니다.");
        setWordbookTitle(json.wordbook?.title ?? "");
        setItems(json.items ?? []);
        setTotalItems(json.paging?.totalItems ?? 0);
        setPartStats(json.paging?.partStats ?? []);
        setPagingPartCount(Math.max(1, json.paging?.partCount ?? 1));
      } catch (e) {
        setError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [mode, partIndex, partSize, reloadTick, wordbookId]);

  const partStatsMap = useMemo(() => new Map(partStats.map((s) => [s.partIndex, s])), [partStats]);
  const displayPartCount = Math.max(1, pagingPartCount, partCount);
  const parts = useMemo(
    () =>
      Array.from({ length: displayPartCount }, (_, idx) => {
        const n = idx + 1;
        const stat = partStatsMap.get(n);
        return {
          partIndex: n,
          totalInPart: stat?.totalInPart ?? 0,
          matchedCount: stat?.matchedCount ?? 0
        };
      }),
    [displayPartCount, partStatsMap]
  );
  const partByIndex = useMemo(() => new Map(parts.map((p) => [p.partIndex, p])), [parts]);
  const activePartStat = partStatsMap.get(partIndex) ?? { totalInPart: 0, matchedCount: 0 };
  const activePartRate =
    activePartStat.totalInPart > 0 ? Math.round((activePartStat.matchedCount / activePartStat.totalInPart) * 100) : 0;
  const remainingParts = Math.max(displayPartCount - partIndex, 0);
  const isInitialLoading = loading && totalItems === 0;
  const totalItemsLabel = isInitialLoading ? "-" : String(totalItems);
  const partCountLabel = isInitialLoading ? "-" : String(displayPartCount);
  const activeMatchedLabel = isInitialLoading ? "-" : String(activePartStat.matchedCount);
  const activeTotalLabel = isInitialLoading ? "-" : String(activePartStat.totalInPart);
  const activeRateLabel = isInitialLoading ? "-" : `${activePartRate}`;
  const remainingPartsLabel = isInitialLoading ? "-" : String(remainingParts);
  const visibleParts = useMemo(() => {
    if (displayPartCount <= 9) return parts.map((p) => ({ kind: "part" as const, part: p }));
    const set = new Set<number>([1, displayPartCount]);
    for (let n = partIndex - 2; n <= partIndex + 2; n += 1) {
      if (n >= 1 && n <= displayPartCount) set.add(n);
    }
    const sorted = Array.from(set).sort((a, b) => a - b);
    const result: Array<{ kind: "part"; part: (typeof parts)[number] } | { kind: "ellipsis"; id: string }> = [];
    for (let i = 0; i < sorted.length; i += 1) {
      const current = sorted[i];
      const prev = sorted[i - 1];
      if (prev && current - prev > 1) result.push({ kind: "ellipsis", id: `ellipsis-${prev}-${current}` });
      const found = partByIndex.get(current);
      if (found) result.push({ kind: "part", part: found });
    }
    return result;
  }, [displayPartCount, partByIndex, partIndex, parts]);

  useEffect(() => {
    setPartJump(String(partIndex));
  }, [partIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.getAttribute("contenteditable") === "true");
      if (isTyping) return;
      if (event.key === "[") {
        event.preventDefault();
        if (partIndex <= 1) {
          setInfo("첫 파트입니다.");
          return;
        }
        setPartIndex(Math.max(1, partIndex - 1));
        setInfo("");
      }
      if (event.key === "]") {
        event.preventDefault();
        if (partIndex >= displayPartCount) {
          setInfo("마지막 파트입니다.");
          return;
        }
        setPartIndex(Math.min(displayPartCount, partIndex + 1));
        setInfo("");
      }
      if (event.key === "Home") {
        event.preventDefault();
        setPartIndex(1);
        setInfo("");
      }
      if (event.key === "End") {
        event.preventDefault();
        setPartIndex(displayPartCount);
        setInfo("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [displayPartCount, partIndex, setPartIndex]);

  useEffect(() => {
    if (!info) return;
    const timeout = window.setTimeout(() => setInfo(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [info]);

  return (
    <section className="space-y-4">
      <header className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">단어장 목록</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{title}</h1>
          {wordbookTitle ? (
            <p className="mt-1 text-sm text-slate-600">{sanitizeUserText(wordbookTitle, "단어장")}</p>
          ) : null}
          <p className="mt-1 text-xs text-slate-500">단축키: `[` 이전 파트 · `]` 다음 파트 · `Home`/`End` 처음/끝 파트</p>
        </div>
        <WordbookStudyTabs wordbookId={wordbookId} active={activeTab(mode)} />
      </header>

      <div className="ui-card p-3">
        <div className="text-xs text-slate-600">의미 표시</div>
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
            onChange={(e) => {
              const next = parseBoundedInt(e.target.value, partSize, 1, 200);
              setPartSize(next);
              setPartIndex(1);
              setPartJump("1");
              setInfo(`파트 크기를 ${next}로 변경했습니다.`);
            }}
            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          />
          <span className="text-slate-500">
            총 {totalItemsLabel}개 / {partCountLabel}개 파트
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          현재 {partIndex}파트: {activeMatchedLabel}/{activeTotalLabel} ({activeRateLabel}%)
          {" · "}남은 파트 {remainingPartsLabel}개
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="list-part-select">
            파트 선택
          </label>
          <select
            id="list-part-select"
            value={partIndex}
            onChange={(event) => {
              setPartIndex(parseBoundedInt(event.target.value, partIndex, 1, displayPartCount));
              setInfo("");
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:hidden"
            disabled={loading}
          >
            {parts.map((part) => (
              <option key={`part-select-${part.partIndex}`} value={part.partIndex}>
                {part.partIndex}파트 ({part.matchedCount}/{part.totalInPart})
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
              setInfo("");
            }}
            disabled={loading || partIndex <= 1}
            className="ui-btn-secondary px-3 py-1 text-xs disabled:opacity-50"
          >
            처음
          </button>
          <button
            type="button"
            onClick={() => {
              if (partIndex <= 1) {
                setInfo("첫 파트입니다.");
                return;
              }
              setPartIndex(Math.max(1, partIndex - 1));
              setInfo("");
            }}
            disabled={loading || partIndex <= 1}
            className="ui-btn-secondary px-3 py-1 text-xs disabled:opacity-50"
          >
            이전 파트
          </button>
          <button
            type="button"
            onClick={() => {
              if (partIndex >= displayPartCount) {
                setInfo("마지막 파트입니다.");
                return;
              }
              setPartIndex(Math.min(displayPartCount, partIndex + 1));
              setInfo("");
            }}
            disabled={loading || partIndex >= displayPartCount}
            className="ui-btn-secondary px-3 py-1 text-xs disabled:opacity-50"
          >
            다음 파트
          </button>
          <button
            type="button"
            onClick={() => {
              if (partIndex >= displayPartCount) {
                setInfo("마지막 파트입니다.");
                return;
              }
              setPartIndex(displayPartCount);
              setInfo("");
            }}
            disabled={loading || partIndex >= displayPartCount}
            className="ui-btn-secondary px-3 py-1 text-xs disabled:opacity-50"
          >
            마지막
          </button>
          <form
            className="flex w-full items-center gap-2 sm:w-auto"
            onSubmit={(event) => {
              event.preventDefault();
              const next = parseBoundedInt(partJump, partIndex, 1, displayPartCount);
              setPartJump(String(next));
              setPartIndex(next);
              setInfo("");
            }}
          >
            <label htmlFor="list-part-jump" className="sr-only">
              이동할 파트 번호
            </label>
            <input
              id="list-part-jump"
              type="number"
              min={1}
              max={displayPartCount}
              value={partJump}
              onChange={(event) => setPartJump(event.target.value)}
              onBlur={() => {
                setPartJump(String(parseBoundedInt(partJump, partIndex, 1, displayPartCount)));
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm sm:w-24"
            />
            <button type="submit" className="ui-btn-secondary px-3 py-1 text-xs">
              이동
            </button>
          </form>
          {visibleParts.map((entry) =>
            entry.kind === "ellipsis" ? (
              <span key={entry.id} className="px-2 py-1 text-xs font-semibold text-slate-400" aria-hidden="true">
                ...
              </span>
            ) : (
              <button
                key={entry.part.partIndex}
                type="button"
                onClick={() => {
                  if (loading) return;
                  setPartIndex(entry.part.partIndex);
                  setInfo("");
                }}
                className={[
                  "rounded-lg border px-3 py-1 text-left text-xs font-semibold",
                  entry.part.partIndex === partIndex
                    ? "ui-tab-active"
                    : "ui-tab-inactive"
                ].join(" ")}
                aria-label={`${entry.part.partIndex}파트 ${entry.part.matchedCount}/${entry.part.totalInPart}`}
                aria-current={entry.part.partIndex === partIndex ? "page" : undefined}
                disabled={loading}
              >
                <span>{entry.part.partIndex}파트</span>
                <span className={entry.part.partIndex === partIndex ? "ml-2 text-slate-200" : "ml-2 text-slate-500"}>
                  {entry.part.matchedCount}/{entry.part.totalInPart}
                </span>
                {entry.part.partIndex === partIndex ? <span className="sr-only">현재 파트</span> : null}
              </button>
            )
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700" role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              setInfo("");
              setError("");
              setReloadTick((v) => v + 1);
            }}
            className="mt-2 ui-btn-secondary px-3 py-1 text-xs"
          >
            다시 시도
          </button>
        </div>
      ) : null}
      {info ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status" aria-live="polite">
          {info}
        </p>
      ) : null}

      <div className="relative min-h-[220px]">
        {loading ? (
          <div className="pointer-events-none absolute right-2 top-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm" role="status" aria-live="polite">
            불러오는 중...
          </div>
        ) : null}

      {!loading && items.length === 0 ? (
        <EmptyStateCard
          title="조건에 맞는 단어가 없습니다"
          description={`${partIndex}파트에서 조건에 맞는 단어를 찾지 못했습니다. 다른 파트를 선택해보세요.`}
          primary={{ label: "암기 화면으로 이동", href: `/wordbooks/${wordbookId}/memorize?partSize=${partSize}&partIndex=${partIndex}` }}
          secondary={{ label: "퀴즈 화면으로 이동", href: `/wordbooks/${wordbookId}/quiz-meaning?partSize=${partSize}&partIndex=${partIndex}` }}
        />
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <article key={item.id} className={`ui-card ui-fade-in ${densityCardClass(densityMode)}`}>
            <h2 className="text-lg font-bold text-slate-900">{item.term}</h2>
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <MeaningView value={sanitizeUserText(item.meaning, "의미 데이터 점검 중입니다")} mode={meaningMode} className="text-sm" />
            </div>
            {item.example ? (
              <p className="mt-2 text-xs text-slate-500">
                예문: {sanitizeUserText(item.example, "예문 데이터 점검 중입니다")}
                {item.exampleMeaning ? ` - ${sanitizeUserText(item.exampleMeaning, "예문 해석 데이터 점검 중입니다")}` : ""}
              </p>
            ) : null}
            {item.itemState ? (
              <p className="mt-2 text-xs text-slate-500">
                상태 {item.itemState.status === "CORRECT" ? "정답" : item.itemState.status === "WRONG" ? "오답" : "새 단어"}
                {" / "}이력 정답 {item.itemState.everCorrect ? "있음" : "없음"}
                {" · "}이력 오답 {item.itemState.everWrong ? "있음" : "없음"}
              </p>
            ) : null}
          </article>
        ))}
      </div>
      </div>
    </section>
  );
}



