"use client";

import { useEffect, useState } from "react";

import { MemorizeWordCard } from "@/components/MemorizeWordCard";
import type { WordCardDto } from "@/components/types";

type MemorizeResponse = {
  words: WordCardDto[];
  total: number;
  page: number;
  batch: number;
};

export default function MemorizePage() {
  const [batch, setBatch] = useState<1 | 5>(1);
  const [hideCorrect, setHideCorrect] = useState(false);
  const [week, setWeek] = useState(1);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<MemorizeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/words?mode=memorize&batch=${batch}&page=${page}&hideCorrect=${hideCorrect}&week=${week}`
        );
        const json = (await res.json()) as MemorizeResponse;
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load words");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [batch, page, hideCorrect, week]);

  useEffect(() => {
    setPage(0);
  }, [batch, hideCorrect, week]);

  const total = data?.total ?? 0;
  const maxPage = Math.max(Math.ceil(total / batch) - 1, 0);

  const handleSaveMeaning = async (wordId: number, ko: string) => {
    const res = await fetch(`/api/words/${wordId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ko })
    });
    const json = (await res.json()) as { error?: string; word?: { id: number; ko: string } };
    if (!res.ok || !json.word) {
      throw new Error(json.error ?? "Failed to save meaning");
    }

    setData((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        words: prev.words.map((w) => (w.id === wordId ? { ...w, ko: json.word!.ko } : w))
      };
    });
  };

  return (
    <section className="space-y-4">
      <header className="rounded-2xl bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold">Memorize Words</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <span>Week</span>
            <select
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
              className="rounded-lg border border-slate-300 px-2 py-1"
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  week{w} ({(w - 1) * 50 + 1}-{w * 50})
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={() => setBatch(1)}
            className={`rounded-lg px-3 py-1 ${batch === 1 ? "bg-slate-900 text-white" : "border border-slate-300"}`}
          >
            1 card
          </button>
          <button
            onClick={() => setBatch(5)}
            className={`rounded-lg px-3 py-1 ${batch === 5 ? "bg-slate-900 text-white" : "border border-slate-300"}`}
          >
            5 cards
          </button>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={hideCorrect}
              onChange={(e) => setHideCorrect(e.target.checked)}
            />
            Hide correct words
          </label>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {data?.words?.map((word) => (
          <MemorizeWordCard key={word.id} word={word} onSaveMeaning={handleSaveMeaning} />
        ))}
      </div>

      {!loading && data && data.words.length === 0 ? (
        <p className="rounded-xl bg-white p-4 text-sm text-slate-600 shadow-sm">
          No words in this week/filter.
        </p>
      ) : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div className="flex items-center gap-2">
        <button
          className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-50"
          onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
          disabled={page <= 0}
        >
          Prev
        </button>
        <button
          className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-50"
          onClick={() => setPage((prev) => Math.min(prev + 1, maxPage))}
          disabled={page >= maxPage}
        >
          Next
        </button>
        <span className="text-sm text-slate-600">
          page {page + 1} / {maxPage + 1}
        </span>
      </div>
    </section>
  );
}
