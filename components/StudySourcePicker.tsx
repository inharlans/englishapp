"use client";

import {
  type DownloadedWordbookOption,
  type StudySource,
  serializeStudySource
} from "@/lib/studySource";

type Props = {
  source: StudySource;
  downloaded: DownloadedWordbookOption[];
  disabled?: boolean;
  onChange: (next: StudySource) => void;
};

export function StudySourcePicker({ source, downloaded, disabled, onChange }: Props) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
      <span className="font-medium">단어장</span>
      <select
        value={serializeStudySource(source)}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "core") {
            onChange({ kind: "core" });
            return;
          }
          const id = Number(raw.replace(/^wb:/, ""));
          if (!Number.isFinite(id) || id <= 0) {
            onChange({ kind: "core" });
            return;
          }
          onChange({ kind: "wordbook", wordbookId: Math.floor(id) });
        }}
        className="min-w-[240px] rounded-lg border border-slate-300 bg-white px-2 py-1 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
      >
        <option value="core">English 1500 (기본)</option>
        {downloaded.map((wb) => (
          <option key={wb.id} value={`wb:${wb.id}`}>
            {wb.title} ({wb.itemCount}개)
          </option>
        ))}
      </select>
    </label>
  );
}

