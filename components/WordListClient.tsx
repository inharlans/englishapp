"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { WordCardDto } from "@/components/types";
import { WordCard } from "@/components/WordCard";

type ListMode = "listCorrect" | "listWrong" | "listHalf";

type ListResponse = {
  words: WordCardDto[];
  total: number;
};

export function WordListClient({
  mode,
  title
}: {
  mode: ListMode;
  title: string;
}) {
  const [words, setWords] = useState<WordCardDto[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setError("");
      try {
        const res = await fetch("/api/words?mode=" + mode + "&batch=5&page=0");
        const data = (await res.json()) as ListResponse;
        setWords(data.words ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "목록 로딩 실패");
      }
    };
    load();
  }, [mode]);

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
                뜻 시험 치기
              </Link>
              <Link
                href="/quiz-word?scope=half"
                className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white"
              >
                영단어 시험 치기
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {words.map((word) => (
          <WordCard key={word.id} word={word} />
        ))}
      </div>

      {words.length === 0 ? (
        <p className="rounded-xl bg-white p-4 text-sm text-slate-600 shadow-sm">
          목록이 비어 있습니다.
        </p>
      ) : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}
