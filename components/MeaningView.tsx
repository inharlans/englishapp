import type { MeaningViewMode } from "@/components/wordbooks/useMeaningViewMode";
import { sanitizeUserText } from "@/lib/textQuality";

type MeaningEntry = {
  tag: string | null;
  text: string;
};

const POS_LABELS: Record<string, string> = {
  noun: "명사",
  verb: "동사",
  adjective: "형용사",
  adverb: "부사",
  pronoun: "대명사",
  preposition: "전치사",
  conjunction: "접속사",
  interjection: "감탄사",
  auxiliary: "조동사",
  article: "관형사",
  numeral: "수사",
  명사: "명사",
  동사: "동사",
  형용사: "형용사",
  부사: "부사",
  대명사: "대명사",
  전치사: "전치사",
  접속사: "접속사",
  감탄사: "감탄사",
  조동사: "조동사",
  관형사: "관형사",
  수사: "수사",
  관사: "관형사"
};

function normalizeTag(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  return POS_LABELS[key] ?? null;
}

function normalizeMeaningText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[|/]/g, ", ")
    .replace(/；|;/g, ", ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\(\s*/g, "(")
    .replace(/\s*\)/g, ")")
    .trim();
}

function splitByDelimiter(text: string): string[] {
  return text
    .split(/[,\n]/g)
    .map((part) => part.replace(/^[-•·\s]+/g, "").trim())
    .filter(Boolean);
}

function parseMeaningEntries(value: string): MeaningEntry[] {
  const normalized = normalizeMeaningText(value);
  if (!normalized) return [];

  const out: MeaningEntry[] = [];
  const regex = /\(([^)]+)\)|([^()]+)/g;
  let currentTag: string | null = null;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(normalized)) !== null) {
    if (match[1]) {
      const tag = normalizeTag(match[1]);
      if (tag) currentTag = tag;
      continue;
    }
    if (!match[2]) continue;

    for (const part of splitByDelimiter(match[2])) {
      // If the part starts with a POS word without spacing, separate it.
      const leadingPos = part.match(/^(명사|동사|형용사|부사|대명사|전치사|접속사|감탄사|조동사|관형사|수사)(.+)$/);
      if (leadingPos) {
        const parsedTag = normalizeTag(leadingPos[1]);
        if (parsedTag) {
          out.push({ tag: parsedTag, text: leadingPos[2].trim() });
          continue;
        }
      }
      out.push({ tag: currentTag, text: part });
    }
  }

  const deduped: MeaningEntry[] = [];
  const seen = new Set<string>();
  for (const entry of out) {
    if (!entry.text) continue;
    const key = `${entry.tag ?? "none"}:${entry.text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }
  return deduped.slice(0, 24);
}

function groupByTag(entries: MeaningEntry[]) {
  const groups: Array<{ key: string; label: string; items: string[] }> = [];
  const map = new Map<string, { key: string; label: string; items: string[] }>();

  for (const entry of entries) {
    const key = entry.tag ?? "none";
    const label = entry.tag ?? "기타";
    if (!map.has(key)) {
      const group = { key, label, items: [] as string[] };
      map.set(key, group);
      groups.push(group);
    }
    map.get(key)!.items.push(entry.text);
  }
  return groups;
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
  const safeValue = sanitizeUserText(value, "뜻 데이터가 비어 있습니다.");
  const entries = parseMeaningEntries(safeValue);

  if (entries.length === 0) {
    return <span className={className}>{safeValue}</span>;
  }

  if (mode === "detailed") {
    const groups = groupByTag(entries);
    return (
      <span className={`flex flex-col gap-1 ${className}`}>
        {groups.map((group) => (
          <span key={group.key} className="text-sm text-slate-700">
            {group.key !== "none" ? (
              <span className="mr-2 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                {group.label}
              </span>
            ) : null}
            {group.items.join(", ")}
          </span>
        ))}
      </span>
    );
  }

  if (entries.length === 1 && !entries[0].tag) {
    return <span className={className}>{entries[0].text}</span>;
  }

  const compactItems = entries.slice(0, 10);
  const hiddenCount = Math.max(0, entries.length - compactItems.length);

  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      {compactItems.map((entry, idx) => (
        <span
          key={`${entry.tag ?? "none"}-${entry.text}-${idx}`}
          className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[12px] text-slate-700"
        >
          {entry.tag ? (
            <>
              <span className="mr-1 rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                {entry.tag}
              </span>
              <span>{entry.text}</span>
            </>
          ) : (
            entry.text
          )}
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
          +{hiddenCount}
        </span>
      ) : null}
    </span>
  );
}
