"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MemorizeWordCard } from "@/components/MemorizeWordCard";
import type { WordCardDto } from "@/components/types";

type MemorizeResponse = {
  words: WordCardDto[];
  total: number;
  page: number;
  batch: number;
};

export default function MemorizePage() {
  const [batch, setBatch] = useState(5);
  const [hideCorrect, setHideCorrect] = useState(false);
  const [week, setWeek] = useState(1);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<MemorizeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageInput, setPageInput] = useState("1");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/words?mode=memorize&batch=${batch}&page=${page}&hideCorrect=${hideCorrect}&week=${week}`
        );
        const json = (await res.json()) as MemorizeResponse & { error?: string };
        if (!res.ok) {
          throw new Error(json.error ?? "Failed to load words");
        }
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load words");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [batch, page, hideCorrect, week]);

  useEffect(() => {
    setPage(0);
  }, [batch, hideCorrect, week]);

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  const total = data?.total ?? 0;
  const words = data?.words ?? [];
  const maxPage = Math.max(Math.ceil(total / batch) - 1, 0);
  const weekStart = (week - 1) * 50 + 1;
  const weekEnd = week * 50;

  const progressInWeek = useMemo(() => {
    if (total === 0) {
      return 0;
    }
    const viewed = Math.min((page + 1) * batch, total);
    return Math.min((viewed / total) * 100, 100);
  }, [page, batch, total]);
  const isSingleCardView = batch === 1;

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

  const jumpToPage = () => {
    const raw = Number(pageInput);
    const requested = Number.isFinite(raw) ? Math.floor(raw) : 1;
    const clamped = Math.min(Math.max(requested, 1), maxPage + 1);
    setPage(clamped - 1);
    setPageInput(String(clamped));
  };

  return (
    <section className="space-y-5">
      <header className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Memorize Track</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Weekly Memory Deck</h1>
            <p className="mt-2 text-sm text-slate-600">
              Review and edit meanings quickly before entering quiz mode.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/quiz-meaning"
              className="rounded-xl border border-teal-300 bg-teal-50 px-3.5 py-2 text-xs font-semibold text-teal-900 transition hover:bg-teal-100"
            >
              Meaning Quiz
            </Link>
            <Link
              href="/quiz-word"
              className="rounded-xl border border-sky-300 bg-sky-50 px-3.5 py-2 text-xs font-semibold text-sky-900 transition hover:bg-sky-100"
            >
              Word Quiz
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <span className="font-medium">Week</span>
            <select
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  week{w} ({(w - 1) * 50 + 1}-{w * 50})
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
            <span>Cards</span>
            <select
              value={batch}
              onChange={(e) => setBatch(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={hideCorrect}
              onChange={(e) => setHideCorrect(e.target.checked)}
              className="h-4 w-4 accent-teal-600"
            />
            Hide correct words
          </label>
        </div>

        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Week range {weekStart}-{weekEnd} | Loaded {words.length} of {total}
            </span>
            <span>{Math.round(progressInWeek)}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressInWeek}%` }}
            />
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {loading ? (
          <div
            className={
              isSingleCardView
                ? "mx-auto grid w-full max-w-3xl gap-3"
                : "grid gap-3 md:grid-cols-2"
            }
          >
            {Array.from({ length: batch }, (_, i) => (
              <div
                key={i}
                className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white/70"
              />
            ))}
          </div>
        ) : (
          <div
            className={
              isSingleCardView
                ? "mx-auto grid w-full max-w-3xl gap-4"
                : "grid gap-4 md:grid-cols-2"
            }
          >
            {words.map((word) => (
              <MemorizeWordCard key={word.id} word={word} onSaveMeaning={handleSaveMeaning} />
            ))}
          </div>
        )}

        {!loading && data && words.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            No words available for this week/filter.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}
      </div>

      <div className="sticky bottom-3 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-white/70 bg-white/90 p-3 shadow-[0_20px_38px_-26px_rgba(15,23,42,0.75)] backdrop-blur">
        <button
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
          disabled={page <= 0 || loading}
        >
          Prev
        </button>
        <button
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => setPage((prev) => Math.min(prev + 1, maxPage))}
          disabled={page >= maxPage || loading}
        >
          Next
        </button>
        <span className="text-sm text-slate-600">
          page {page + 1} / {maxPage + 1}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") {
                return;
              }
              e.preventDefault();
              jumpToPage();
            }}
            inputMode="numeric"
            className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            aria-label="Jump to page"
            disabled={loading}
          />
          <button
            type="button"
            onClick={jumpToPage}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Go
          </button>
        </div>
      </div>
    </section>
  );
}
