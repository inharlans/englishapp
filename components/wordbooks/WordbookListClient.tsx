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
  const [totalItems, setTotalItems] = useState(0);
  const [partStats, setPartStats] = useState<Array<{ partIndex: number; totalInPart: number; matchedCount: number }>>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
        if (!res.ok) throw new Error(json.error ?? "Failed to load list.");
        setItems(json.items ?? []);
        setTotalItems(json.paging?.totalItems ?? 0);
        setPartStats(json.paging?.partStats ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load list.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [mode, partIndex, partSize, wordbookId]);

  const partStatsMap = useMemo(() => new Map(partStats.map((s) => [s.partIndex, s])), [partStats]);
  const parts = Array.from({ length: partCount }, (_, idx) => {
    const n = idx + 1;
    const stat = partStatsMap.get(n);
    return {
      partIndex: n,
      totalInPart: stat?.totalInPart ?? 0,
      matchedCount: stat?.matchedCount ?? 0
    };
  });

  return (
    <section className="space-y-4">
      <header className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Wordbook List</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{title}</h1>
        </div>
        <WordbookStudyTabs wordbookId={wordbookId} active={activeTab(mode)} />
      </header>

      <div className="ui-card p-3">
        <div className="text-xs text-slate-600">?섎? ?쒖떆</div>
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
              媛꾧껐
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
              ?먯꽭??            </button>
          </div>
          <DensityModeToggle mode={densityMode} onChange={setDensityMode} />
        </div>
      </div>

      <div className="ui-card p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="font-semibold text-slate-700">Part ?ш린(n)</label>
          <input
            type="number"
            min={1}
            max={200}
            value={partSize}
            onChange={(e) => setPartSize(Number(e.target.value))}
            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          />
          <span className="text-slate-500">
            珥?{totalItems}媛?쨌 {partCount}媛?part
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {parts.map((p) => (
            <button
              key={p.partIndex}
              type="button"
              onClick={() => setPartIndex(p.partIndex)}
              className={[
                "rounded-lg border px-3 py-1 text-left text-xs font-semibold",
                p.partIndex === partIndex
                  ? "ui-tab-active"
                  : "ui-tab-inactive"
              ].join(" ")}
            >
              <span>Part {p.partIndex}</span>
              <span className={p.partIndex === partIndex ? "ml-2 text-slate-200" : "ml-2 text-slate-500"}>
                {p.matchedCount}/{p.totalInPart}
              </span>
            </button>
          ))}
        </div>
      </div>

            {error ? (
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{error}</p>
      ) : null}

      <div className="relative min-h-[220px]">
        {loading ? (
          <div className="pointer-events-none absolute right-2 top-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
            Loading...
          </div>
        ) : null}

      {!loading && items.length === 0 ? (
        <EmptyStateCard
          title="議곌굔??留욌뒗 ?⑥뼱媛 ?놁뒿?덈떎"
          description={`Part ${partIndex}?먯꽌 議곌굔??留욌뒗 ?⑥뼱瑜?李얠? 紐삵뻽?듬땲?? ?ㅻⅨ part瑜??좏깮?대낫?몄슂.`}
          primary={{ label: "?붽린 ??쑝濡??대룞", href: `/wordbooks/${wordbookId}/memorize` }}
          secondary={{ label: "?댁쫰 ??쑝濡??대룞", href: `/wordbooks/${wordbookId}/quiz-meaning` }}
        />
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
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
            {item.itemState ? (
              <p className="mt-2 text-xs text-slate-500">
                status {item.itemState.status} / history C:{item.itemState.everCorrect ? "Y" : "N"} W:
                {item.itemState.everWrong ? "Y" : "N"}
              </p>
            ) : null}
          </article>
        ))}
      </div>
      </div>
    </section>
  );
}



