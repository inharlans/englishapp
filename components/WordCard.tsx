import type { WordCardDto } from "@/components/types";

export function WordCard({ word }: { word: WordCardDto }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 text-2xl font-semibold">{word.en}</div>
      <div className="text-lg text-slate-700">{word.ko}</div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
        <span>streak: {word.progress?.correctStreak ?? 0}</span>
        <span>last: {word.resultState?.lastResult ?? "NONE"}</span>
      </div>
    </article>
  );
}
