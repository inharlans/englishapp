import { Fragment } from "react";

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

export function MeaningView({ value, className = "" }: { value: string; className?: string }) {
  const parts = splitMeaning(value);
  if (parts.length <= 1) {
    const extracted = extractPosTag(parts[0] ?? value);
    if (!extracted.tag) return <span className={className}>{value}</span>;
    return (
      <span className={className}>
        <span className="mr-1 rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
          {extracted.tag}
        </span>
        {extracted.body}
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
                    {extracted.tag}
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

