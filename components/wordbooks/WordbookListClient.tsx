"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MeaningView } from "@/components/MeaningView";
import { apiFetch } from "@/lib/clientApi";

type ListMode = "listCorrect" | "listWrong" | "listHalf";

type Item = {
  id: number;
  term: string;
  meaning: string;
  example: string | null;
  exampleMeaning: string | null;
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

  const filtered = useMemo(
    () => items.filter((item) => matches(mode, states.get(item.id))),
    [items, mode, states]
  );

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Wordbook List</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">{wordbookTitle || "단어장"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={{ pathname: `/wordbooks/${wordbookId}/memorize` }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50">Memorize</Link>
          <Link href={{ pathname: `/wordbooks/${wordbookId}/quiz-meaning` }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50">Quiz Meaning</Link>
          <Link href={{ pathname: `/wordbooks/${wordbookId}/quiz-word` }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50">Quiz Word</Link>
          <Link href={{ pathname: `/wordbooks/${wordbookId}` }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50">Back</Link>
        </div>
      </header>

      {loading ? <p className="text-sm text-slate-600">Loading...</p> : null}
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          해당 조건에 맞는 단어가 없습니다.
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((item) => {
          const state = states.get(item.id);
          return (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-bold text-slate-900">{item.term}</h2>
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <MeaningView value={item.meaning} className="text-sm" />
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
