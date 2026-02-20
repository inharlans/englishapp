import type { WordPair } from "@/lib/types";

type ParseSuccess = {
  delimiter: "\t" | ",";
  rows: WordPair[];
};

function splitAndTrim(line: string, delimiter: "\t" | ","): string[] {
  return line.split(delimiter).map((cell) => cell.trim());
}

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeEn(value: string): string {
  return collapseSpaces(value)
    .toLowerCase()
    .replace(/[-_]+/g, " ");
}

export function normalizeKo(value: string): string {
  return collapseSpaces(value);
}

function stripMeaningAffixes(value: string): string {
  return collapseSpaces(
    value
      .replace(/^[\s"'`~.,·•…\-_/\\:;!?()[\]{}<>]+/gu, "")
      .replace(/[\s"'`~.,·•…\-_/\\:;!?()[\]{}<>]+$/gu, "")
      .replace(/^[.·•…~\-_/\\:;!?]+/gu, "")
  );
}

function stripLeadingPosTag(value: string): string {
  return value
    .replace(/^(?:\([^)]{1,8}\)\s*)+/u, "")
    .trim();
}

export function getMeaningCandidates(value: string): string[] {
  const candidates = new Set<string>();
  const chunks = [value, ...value.split(/[,:;\/|]+/g)];

  for (const chunk of chunks) {
    const normalized = normalizeKo(chunk);
    if (!normalized) continue;
    candidates.add(normalized);

    const withoutTag = normalizeKo(stripLeadingPosTag(normalized));
    if (withoutTag) {
      candidates.add(withoutTag);
    }

    const stripped = stripMeaningAffixes(normalized);
    if (stripped) {
      candidates.add(stripped);
    }

    const strippedWithoutTag = stripMeaningAffixes(withoutTag);
    if (strippedWithoutTag) {
      candidates.add(strippedWithoutTag);
    }
  }

  return [...candidates];
}

function parseWithDelimiter(rawText: string, delimiter: "\t" | ","): ParseSuccess | null {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { delimiter, rows: [] };
  }

  const header = splitAndTrim(lines[0], delimiter).map((col) => col.toLowerCase());
  const enIdx = header.findIndex((h) => h === "en");
  const koIdx = header.findIndex((h) => h === "ko");

  if (enIdx === -1 || koIdx === -1) {
    return null;
  }

  const rows: WordPair[] = [];
  const seenEn = new Set<string>();

  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitAndTrim(lines[i], delimiter);
    const en = cols[enIdx] ?? "";
    const ko = cols[koIdx] ?? "";

    if (!en || !ko) {
      continue;
    }

    const normalizedEn = normalizeEn(en);
    if (!normalizedEn || seenEn.has(normalizedEn)) {
      continue;
    }
    seenEn.add(normalizedEn);

    rows.push({ en: collapseSpaces(en), ko: collapseSpaces(ko) });
  }

  return { delimiter, rows };
}

export function parseWords(rawText: string): ParseSuccess {
  const tsvResult = parseWithDelimiter(rawText, "\t");
  if (tsvResult) {
    return tsvResult;
  }

  const csvResult = parseWithDelimiter(rawText, ",");
  if (csvResult) {
    return csvResult;
  }

  throw new Error("헤더에서 en/ko 컬럼을 찾지 못했습니다.");
}
