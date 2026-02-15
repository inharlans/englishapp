"use client";

import { useMemo } from "react";

type Props = {
  value: number; // 0..5 (display)
  count?: number;
  onChange?: (next: number) => void;
  disabled?: boolean;
};

export function StarRating({ value, count, onChange, disabled }: Props) {
  const rounded = useMemo(() => {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(5, value));
  }, [value]);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, idx) => {
          const n = idx + 1;
          const filled = rounded >= n - 0.25;
          const clickable = !!onChange && !disabled;
          return (
            <button
              key={n}
              type="button"
              onClick={clickable ? () => onChange(n) : undefined}
              disabled={!clickable}
              className={[
                "h-7 w-7 select-none text-lg leading-none",
                clickable ? "cursor-pointer hover:scale-105" : "cursor-default",
                filled ? "text-amber-500" : "text-slate-300",
                disabled ? "opacity-60" : ""
              ].join(" ")}
              aria-label={`${n} stars`}
            >
              ★
            </button>
          );
        })}
      </div>
      <div className="text-xs text-slate-600">
        <span className="font-semibold text-slate-800">{rounded.toFixed(1)}</span>
        {typeof count === "number" ? <span className="ml-1">({count})</span> : null}
      </div>
    </div>
  );
}

