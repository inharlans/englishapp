"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { WordCardDto } from "@/components/types";
import { WordCard } from "@/components/WordCard";

type ListMode = "listCorrect" | "listWrong" | "listHalf";

type ListResponse = {
  words: WordCardDto[];
  total: number;
  maxWeek?: number;
};

export function WordListClient({
  mode,
  title
}: {
  mode: ListMode;
  title: string;
}) {
  const [words, setWords] = useState<WordCardDto[]>([]);
  const [maxWeek, setMaxWeek] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setError("");
      try {
        const res = await fetch("/api/words?mode=" + mode + "&batch=5&page=0");
        const data = (await res.json()) as ListResponse & { error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load words");
        }
        setWords(data.words ?? []);
        setMaxWeek(Math.max(data.maxWeek ?? 1, 1));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load words");
      }
    };
    void load();
  }, [mode]);

  useEffect(() => {
    setSelectedWeek(null);
  }, [mode]);

  const modeTheme =
    mode === "listWrong"
      ? {
          title: "Weekly Wrong Progress",
          active: "border-rose-600 bg-rose-600 text-white",
          inactive: "border-slate-200 bg-white text-slate-700 hover:border-rose-300",
          badgeTone: "wrong" as const
        }
      : mode === "listHalf"
        ? {
            title: "Weekly Recovered Progress",
            active: "border-amber-600 bg-amber-600 text-white",
            inactive: "border-slate-200 bg-white text-slate-700 hover:border-amber-300",
            badgeTone: "half" as const
          }
        : {
            title: "Weekly Correct Progress",
            active: "border-teal-600 bg-teal-600 text-white",
            inactive: "border-slate-200 bg-white text-slate-700 hover:border-teal-300",
            badgeTone: "correct" as const
          };

  const weekCards = useMemo(() => {
    return Array.from({ length: maxWeek }, (_, i) => {
      const week = i + 1;
      const count = words.filter((word) => word.memorizeWeek === week).length;
      return { week, count };
    });
  }, [maxWeek, words]);

  const visibleWords = selectedWeek
    ? words.filter((word) => word.memorizeWeek === selectedWeek)
    : words;

  return (
    <section className="space-y-4">
      <header className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {mode === "listHalf" ? (
            <div className="flex gap-2">
              <Link
                href="/quiz-meaning?scope=half"
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white"
              >
                Meaning Quiz
              </Link>
              <Link
                href="/quiz-word?scope=half"
                className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white"
              >
                Word Quiz
              </Link>
            </div>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {modeTheme.title}
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => setSelectedWeek(null)}
              className={`rounded-xl border px-3 py-2 text-left transition ${
                selectedWeek === null
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em]">All Weeks</p>
              <p className="mt-1 text-sm font-semibold">{words.length} words</p>
            </button>
            {weekCards.map((item) => (
              <button
                key={item.week}
                type="button"
                onClick={() => setSelectedWeek(item.week)}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  selectedWeek === item.week
                    ? modeTheme.active
                    : modeTheme.inactive
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em]">week {item.week}</p>
                <p className="mt-1 text-sm font-semibold">{item.count}/50</p>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="space-y-1.5">
        {visibleWords.map((word) => (
          <WordCard
            key={word.id}
            word={word}
            showWeekPosition={
              mode === "listCorrect" || mode === "listWrong" || mode === "listHalf"
            }
            weekBadgeTone={modeTheme.badgeTone}
          />
        ))}
      </div>

      {visibleWords.length === 0 ? (
        <p className="rounded-xl bg-white p-4 text-sm text-slate-600 shadow-sm">No words found.</p>
      ) : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}
