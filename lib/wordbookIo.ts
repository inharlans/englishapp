export type ParsedWordbookRow = {
  term: string;
  meaning: string;
  pronunciation?: string | null;
  example?: string | null;
  exampleMeaning?: string | null;
};

function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cols.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  cols.push(cur.trim());
  return cols.map((c) => c.replace(/^"|"$/g, "").trim());
}

function autoPronunciation(term: string): string | null {
  const normalized = term
    .toLowerCase()
    .replace(/[^a-z0-9' -]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || null;
}

export function parseWordbookText(input: {
  rawText: string;
  format: "tsv" | "csv";
  fillPronunciation?: boolean;
}): ParsedWordbookRow[] {
  const lines = input.rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const splitter = input.format === "csv" ? splitCsvLine : (line: string) => line.split("\t");

  const firstCols = splitter(lines[0]).map((c) => c.trim().toLowerCase());
  const hasHeader = firstCols.includes("term") || firstCols.includes("meaning") || firstCols.includes("en");
  const start = hasHeader ? 1 : 0;

  const rows: ParsedWordbookRow[] = [];
  for (let i = start; i < lines.length; i += 1) {
    const cols = splitter(lines[i]).map((c) => c.trim());
    const term = cols[0] ?? "";
    const meaning = cols[1] ?? "";
    if (!term || !meaning) continue;

    const pronunciationRaw = cols[2] ?? "";
    const example = cols[3] ? cols[3] : null;
    const exampleMeaning = cols[4] ? cols[4] : null;
    const pronunciation =
      pronunciationRaw ||
      !input.fillPronunciation
        ? pronunciationRaw || null
        : autoPronunciation(term);

    rows.push({
      term,
      meaning,
      pronunciation,
      example,
      exampleMeaning
    });
  }
  return rows;
}

export function toDelimitedWordbook(input: {
  rows: ParsedWordbookRow[];
  format: "tsv" | "csv";
}): string {
  const header = ["term", "meaning", "pronunciation", "example", "exampleMeaning"];
  const quoteCsv = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = [header];
  for (const row of input.rows) {
    lines.push([
      row.term,
      row.meaning,
      row.pronunciation ?? "",
      row.example ?? "",
      row.exampleMeaning ?? ""
    ]);
  }

  if (input.format === "csv") {
    return `${lines.map((line) => line.map(quoteCsv).join(",")).join("\n")}\n`;
  }
  return `${lines.map((line) => line.join("\t")).join("\n")}\n`;
}

