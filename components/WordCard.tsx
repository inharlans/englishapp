import type { WordCardDto } from "@/components/types";
import { MeaningView } from "@/components/MeaningView";

export function WordCard({
  word,
  showWeekPosition = false,
  weekBadgeTone = "correct"
}: {
  word: WordCardDto;
  showWeekPosition?: boolean;
  weekBadgeTone?: "correct" | "wrong" | "half";
}) {
  const week = word.memorizeWeek;
  const weekPosition = word.memorizePosition;
  const badgeToneClass =
    weekBadgeTone === "wrong"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : weekBadgeTone === "half"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-teal-200 bg-teal-50 text-teal-800";

  return (
    <article className="rounded-xl border border-slate-200/70 bg-white/85 px-3 py-2 shadow-[0_8px_18px_-16px_rgba(15,23,42,0.7)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-slate-900">{word.en}</p>
          <p className="mt-1 text-sm text-slate-700">
            <MeaningView value={word.ko} />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {showWeekPosition && week && weekPosition ? (
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-semibold ${badgeToneClass}`}>
              W{week} #{weekPosition}
            </span>
          ) : null}
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-600">
            S {word.progress?.correctStreak ?? 0}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-600">
            {word.resultState?.lastResult ?? "NONE"}
          </span>
        </div>
      </div>
    </article>
  );
}
