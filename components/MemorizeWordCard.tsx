"use client";

import { useEffect, useState } from "react";

import { MeaningView } from "@/components/MeaningView";
import type { WordCardDto } from "@/components/types";

type Props = {
  word: WordCardDto;
  onSaveMeaning?: (wordId: number, ko: string) => Promise<void>;
  readOnlyMeaning?: boolean;
};

export function MemorizeWordCard({ word, onSaveMeaning, readOnlyMeaning = false }: Props) {
  const [koInput, setKoInput] = useState(word.ko);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setKoInput(word.ko);
  }, [word.ko, word.id]);

  const handleSave = async () => {
    const nextMeaning = koInput.trim();
    if (!nextMeaning) {
      setError("Meaning cannot be empty.");
      setMessage("");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (!onSaveMeaning) return;
      await onSaveMeaning(word.id, nextMeaning);
      setMessage("Meaning updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const streak = word.progress?.correctStreak ?? 0;
  const lastResult = word.resultState?.lastResult ?? "NONE";

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_16px_36px_-24px_rgba(15,23,42,0.6)] backdrop-blur transition hover:-translate-y-0.5 hover:border-teal-300">
      <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">{word.en}</h2>

      <div className="space-y-2.5">
        <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Meaning
        </label>
        {readOnlyMeaning ? (
          <div className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900">
            <MeaningView value={word.ko} className="text-sm text-slate-800" />
          </div>
        ) : (
          <>
            <input
              value={koInput}
              onChange={(e) => setKoInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") {
                  return;
                }
                e.preventDefault();
                void handleSave();
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            />
            <button
              onClick={() => void handleSave()}
              disabled={saving || !onSaveMeaning}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save meaning"}
            </button>
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
          Streak {streak}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700">
          Last {lastResult}
        </span>
      </div>

      {readOnlyMeaning ? (
        <p className="mt-2 text-xs text-slate-500">다운로드 단어장은 뜻 수정이 비활성화됩니다.</p>
      ) : null}
      {message ? <p className="mt-2 text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
    </article>
  );
}
