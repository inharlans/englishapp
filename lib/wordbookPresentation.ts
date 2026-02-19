import { isBrokenUserText } from "@/lib/textQuality";

export function splitWordbookDescription(raw: string | null | undefined): {
  displayDescription: string | null;
  internalSource: string | null;
} {
  const text = (raw ?? "").trim();
  if (!text || isBrokenUserText(text)) return { displayDescription: null, internalSource: null };

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const internalLines: string[] = [];
  const displayLines: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      lower.startsWith("imported from") ||
      lower.startsWith("source:") ||
      lower.startsWith("derived/") ||
      lower.includes("/tmp/") ||
      lower.includes(".jsonl")
    ) {
      internalLines.push(line);
      continue;
    }
    if (!isBrokenUserText(line)) {
      displayLines.push(line);
    }
  }

  return {
    displayDescription: displayLines.length > 0 ? displayLines.join("\n") : null,
    internalSource: internalLines.length > 0 ? internalLines.join(" | ") : null
  };
}

export function deriveWordbookBadges(input: {
  itemCount: number;
  ratingAvg: number;
  ratingCount: number;
  downloadCount?: number;
  createdAt?: Date;
  hasDescription?: boolean;
  isRecommended?: boolean;
}): string[] {
  const badges: string[] = [];

  if (input.isRecommended) badges.push("추천");

  if (typeof input.createdAt !== "undefined") {
    const ageDays = Math.max(0, (Date.now() - input.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (ageDays <= 14) badges.push("신규");
  }

  if ((input.downloadCount ?? 0) >= 10) {
    badges.push("많이 다운로드");
  }

  if (input.hasDescription) {
    badges.push("설명 있음");
  }

  if (input.itemCount >= 500) badges.push("고급");
  else if (input.itemCount >= 250) badges.push("중급");
  else badges.push("입문");

  if (input.ratingCount >= 5 && input.ratingAvg >= 4.5) badges.push("평점 우수");
  else if (input.ratingCount >= 10) badges.push("검증됨");

  return badges;
}
