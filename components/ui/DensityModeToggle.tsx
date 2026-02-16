"use client";

import type { DensityMode } from "@/components/ui/useDensityMode";

export function DensityModeToggle({
  mode,
  onChange
}: {
  mode: DensityMode;
  onChange: (mode: DensityMode) => void;
}) {
  const options: Array<{ key: DensityMode; label: string }> = [
    { key: "compact", label: "컴팩트" },
    { key: "standard", label: "표준" },
    { key: "focus", label: "집중" }
  ];

  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs" aria-label="밀도 모드">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={[
            "rounded-lg px-2.5 py-1.5 font-semibold transition",
            mode === opt.key ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
