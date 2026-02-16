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

type ListMode = "listCorrect" | "listWrong" | "listHalf";

type Item = {
  id: number;
  term: string;
  meaning: string;
  example: string | null;
  exampleMeaning: string | null;
  position?: number | null;
};

type ItemState = {
  itemId: number;
  status: "NEW" | "CORRECT" | "WRONG";
  everCorrect: boolean;
  everWrong: boolean;
};

type StudyPayload = {
  wordbook?: { title: string; items: Item[] };
  itemStates?: ItemState[];
  error?: string;
};

function matches(mode: ListMode, state?: ItemState) {
  if (!state) return false;
  if (mode === "listCorrect") return state.status === "CORRECT";
  if (mode === "listWrong") return state.status === "WRONG";
  return state.everCorrect && state.everWrong;
}

function activeTab(mode: ListMode) {
  if (mode === "listCorrect") return "list-correct" as const;
  if (mode === "listWrong") return "list-wrong" as const;
  return "list-half" as const;
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
  const [wordbookTitle, setWordbookTitle] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [states, setStates] = useState<Map<number, ItemState>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { mode: meaningMode, setMode: setMeaningMode } = useMeaningViewMode();
  const { mode: densityMode, setMode: setDensityMode } = useDensityMode();
  const { partSize, setPartSize, partIndex, setPartIndex, partCount } = useWordbookParting(wordbookId, items.length);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await apiFetch(`/api/wordbooks/${wordbookId}/study`, { cache: "no-store" });
        const json = (await res.json()) as StudyPayload;
        if (!res.ok || !json.wordbook) throw new Error(json.error ?? "Failed to load list.");
        setWordbookTitle(json.wordbook.title);
        setItems(json.wordbook.items ?? []);
        setStates(new Map((json.itemStates ?? []).map((s) => [s.itemId, s])));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load list.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [wordbookId]);

  const partStart = (partIndex - 1) * partSize;
  const partItems = useMemo(() => items.slice(partStart, partStart + partSize), [items, partStart, partSize]);

  const partStats = useMemo(
    () =>
      Array.from({ length: partCount }, (_, idx) => {
        const start = idx * partSize;
        const segment = items.slice(start, start + partSize);
        const matchedCount = segment.filter((item) => matches(mode, states.get(item.id))).length;
        return {
          partNumber: idx + 1,
          totalInPart: segment.length,
          matchedCount
        };
      }),
    [items, mode, partCount, partSize, states]
  );

  const filtered = useMemo(
    () => partItems.filter((item) => matches(mode, states.get(item.id))),
    [partItems, mode, states]
  );

  return (
    <section className="space-y-4">
      <header className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Wordbook List</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">{wordbookTitle || "단어장"}</p>
        </div>
        <WordbookStudyTabs wordbookId={wordbookId} active={activeTab(mode)} />
      </header>

      <div className="ui-card p-3">
        <div className="text-xs text-slate-600">의미 표시</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 p-1 text-xs">
            <button type="button" onClick={() => setMeaningMode("compact")} className={meaningMode === "compact" ? "rounded-md bg-slate-900 px-2 py-1 font-semibold text-white" : "rounded-md px-2 py-1 text-slate-700"}>간결</button>
            <button type="button" onClick={() => setMeaningMode("detailed")} className={meaningMode === "detailed" ? "rounded-md bg-slate-900 px-2 py-1 font-semibold text-white" : "rounded-md px-2 py-1 text-slate-700"}>자세히</button>
          </div>
          <DensityModeToggle mode={densityMode} onChange={setDensityMode} />
        </div>
      </div>

      <div className="ui-card p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="font-semibold text-slate-700">Part 크기(n)</label>
          <input
            type="number"
            min={1}
            max={200}
            value={partSize}
            onChange={(e) => setPartSize(Number(e.target.value))}
            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          />
          <span className="text-slate-500">
            총 {items.length}개 · {partCount}개 part
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {partStats.map((s) => (
            <button
              key={s.partNumber}
              type="button"
              onClick={() => setPartIndex(s.partNumber)}
              className={[
                "rounded-lg border px-3 py-1 text-left text-xs font-semibold",
                s.partNumber === partIndex
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              ].join(" ")}
            >
              <span>Part {s.partNumber}</span>
              <span className={s.partNumber === partIndex ? "ml-2 text-slate-200" : "ml-2 text-slate-500"}>
                {s.matchedCount}/{s.totalInPart}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-600">Loading...</p> : null}
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <EmptyStateCard
          title="조건에 맞는 단어가 없습니다"
          description={`Part ${partIndex}에서 조건에 맞는 단어를 찾지 못했습니다. 다른 part를 선택해보세요.`}
          primary={{ label: "암기 탭으로 이동", href: `/wordbooks/${wordbookId}/memorize` }}
          secondary={{ label: "퀴즈 탭으로 이동", href: `/wordbooks/${wordbookId}/quiz-meaning` }}
        />
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((item) => {
          const state = states.get(item.id);
          return (
            <article key={item.id} className={`ui-card ui-fade-in ${densityCardClass(densityMode)}`}>
              <h2 className="text-lg font-bold text-slate-900">{item.term}</h2>
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <MeaningView value={item.meaning} mode={meaningMode} className="text-sm" />
              </div>
              {item.example ? (
                <p className="mt-2 text-xs text-slate-500">
                  e.g. {item.example}
                  {item.exampleMeaning ? ` - ${item.exampleMeaning}` : ""}
                </p>
              ) : null}
              {state ? (
                <p className="mt-2 text-xs text-slate-500">
                  status {state.status} / history C:{state.everCorrect ? "Y" : "N"} W:{state.everWrong ? "Y" : "N"}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
