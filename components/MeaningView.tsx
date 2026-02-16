import { Fragment } from "react";
import type { MeaningViewMode } from "@/components/wordbooks/useMeaningViewMode";

function splitMeaning(value: string): string[] {
  return value
    .split(/[;,|/]/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function extractPosTag(part: string): { tag: string | null; body: string } {
  const match = part.match(/^(\([^)]+\))(.*)$/);
  if (!match) return { tag: null, body: part };
  return { tag: match[1], body: match[2].trim() };
}

function normalizeTag(tag: string): string {
  const t = tag.replace(/[()]/g, "").trim();
  const map: Record<string, string> = {
    명: "명사",
    동: "동사",
    형: "형용사",
    부: "부사",
    대: "대명사",
    전: "전치사",
    접: "접속사",
    감: "감탄사"
  };
  return map[t] ?? t;
}

export function MeaningView({
  value,
  className = "",
  mode = "compact"
}: {
  value: string;
  className?: string;
  mode?: MeaningViewMode;
}) {
  const parts = splitMeaning(value);
  if (parts.length <= 1) {
    const extracted = extractPosTag(parts[0] ?? value);
    if (!extracted.tag) return <span className={className}>{value}</span>;
    const tagLabel = normalizeTag(extracted.tag);
    return (
      <span className={className}>
        <span className="mr-1 rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
          {tagLabel}
        </span>
        {extracted.body}
      </span>
    );
  }

  if (mode === "detailed") {
    return (
      <span className={`flex flex-col gap-1 ${className}`}>
        {parts.map((part, idx) => {
          const extracted = extractPosTag(part);
          return (
            <span key={`${part}-${idx}`} className="inline-flex items-center gap-1">
              {extracted.tag ? (
                <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800">
                  {normalizeTag(extracted.tag)}
                </span>
              ) : null}
              <span>{extracted.body}</span>
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      {parts.map((part, idx) => {
        const extracted = extractPosTag(part);
        return (
          <Fragment key={`${part}-${idx}`}>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[12px] text-slate-700">
              {extracted.tag ? (
                <>
                  <span className="mr-1 rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                    {normalizeTag(extracted.tag)}
                  </span>
                  {extracted.body}
                </>
              ) : (
                extracted.body
              )}
            </span>
          </Fragment>
        );
      })}
    </span>
  );
}
