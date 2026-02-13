"use client";

import { useEffect, useState } from "react";

import type { WordCardDto } from "@/components/types";

type Props = {
  word: WordCardDto;
  onSaveMeaning: (wordId: number, ko: string) => Promise<void>;
};

export function MemorizeWordCard({ word, onSaveMeaning }: Props) {
  const [koInput, setKoInput] = useState(word.ko);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setKoInput(word.ko);
  }, [word.ko, word.id]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await onSaveMeaning(word.id, koInput);
      setMessage("뜻이 저장되었습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 text-2xl font-semibold">{word.en}</div>
      <div className="space-y-2">
        <label className="block text-sm text-slate-600">뜻(수정 가능)</label>
        <input
          value={koInput}
          onChange={(e) => setKoInput(e.target.value)}
          className="w-full rounded-lg border border-slate-300 p-2"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-60"
        >
          {saving ? "저장 중..." : "뜻 저장"}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
        <span>streak: {word.progress?.correctStreak ?? 0}</span>
        <span>last: {word.resultState?.lastResult ?? "NONE"}</span>
      </div>
      {message ? <p className="mt-2 text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
    </article>
  );
}
