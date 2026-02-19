export function splitWordbookDescription(raw: string | null | undefined): {
  displayDescription: string | null;
  internalSource: string | null;
} {
  const text = (raw ?? "").trim();
  if (!text) return { displayDescription: null, internalSource: null };

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
    displayLines.push(line);
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
}): string[] {
  const badges: string[] = [];

  if (input.itemCount >= 500) badges.push("고급");
  else if (input.itemCount >= 250) badges.push("중급");
  else badges.push("입문");

  if (input.ratingCount >= 5 && input.ratingAvg >= 4.5) badges.push("추천");
  else if (input.ratingCount >= 10) badges.push("검증됨");

  return badges;
}
