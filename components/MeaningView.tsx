import type { MeaningViewMode } from "@/components/wordbooks/useMeaningViewMode";

type MeaningEntry = {
  tag: string | null;
  text: string;
};

function normalizeTag(tag: string): string {
  const t = tag.replace(/[()]/g, "").trim();
  const map: Record<string, string> = {
    "명": "명사",
    "동": "동사",
    "형": "형용사",
    "부": "부사",
    "대": "대명사",
    "전": "전치사",
    "접": "접속사",
    "감": "감탄사"
  };
  return map[t] ?? t;
}

function splitPrimary(value: string): string[] {
  return value
    .split(/[;|/\n]/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitSecondary(text: string): string[] {
  return text
    .split(/[,]/g)
    .map((part) => part.replace(/^[-\u2022]\s*/, "").trim())
    .filter(Boolean);
}

function pushEntry(entries: MeaningEntry[], tag: string | null, raw: string) {
  const parts = splitSecondary(raw);
  for (const part of parts) {
    entries.push({ tag, text: part });
  }
}

function parseMeaningEntries(value: string): MeaningEntry[] {
  const chunks = splitPrimary(value);
  if (chunks.length === 0) return [];

  const entries: MeaningEntry[] = [];
  let currentTag: string | null = null;

  for (const chunk of chunks) {
    const regex = /\(([^)]+)\)/g;
    let cursor = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(chunk)) !== null) {
      const before = chunk.slice(cursor, match.index).trim();
      if (before) {
        pushEntry(entries, currentTag, before);
      }

      currentTag = match[1].trim();
      cursor = match.index + match[0].length;
    }

    const rest = chunk.slice(cursor).trim();
    if (rest) {
      pushEntry(entries, currentTag, rest);
    }
  }

  return entries;
}

function groupByTag(entries: MeaningEntry[]) {
  const groups: Array<{ key: string; label: string; items: string[] }> = [];
  const byKey = new Map<string, { key: string; label: string; items: string[] }>();

  for (const entry of entries) {
    const key = entry.tag ?? "__none__";
    const label = entry.tag ? normalizeTag(entry.tag) : "기타";

    if (!byKey.has(key)) {
      const group = { key, label, items: [] as string[] };
      byKey.set(key, group);
      groups.push(group);
    }

    byKey.get(key)!.items.push(entry.text);
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
  const entries = parseMeaningEntries(value);

  if (entries.length === 0) {
    return <span className={className}>{value}</span>;
  }

  if (mode === "detailed") {
    const groups = groupByTag(entries);

    if (groups.length === 1 && groups[0].key === "__none__") {
      return (
        <span className={`flex flex-col gap-1 ${className}`}>
          {groups[0].items.map((item, idx) => (
            <span key={`${item}-${idx}`}>{item}</span>
          ))}
        </span>
      );
    }

    return (
      <span className={`flex flex-col gap-2 ${className}`}>
        {groups.map((group) => (
          <span key={group.key} className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-teal-800">{group.label}</span>
            {group.items.map((item, idx) => (
              <span key={`${group.key}-${item}-${idx}`} className="text-sm text-slate-700">
                - {item}
              </span>
            ))}
          </span>
        ))}
      </span>
    );
  }

  if (entries.length === 1 && !entries[0].tag) {
    return <span className={className}>{entries[0].text}</span>;
  }

  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      {entries.map((entry, idx) => (
        <span
          key={`${entry.tag ?? "none"}-${entry.text}-${idx}`}
          className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[12px] text-slate-700"
        >
          {entry.tag ? (
            <>
              <span className="mr-1 rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                {normalizeTag(entry.tag)}
              </span>
              {entry.text}
            </>
          ) : (
            entry.text
          )}
        </span>
      ))}
    </span>
  );
}
