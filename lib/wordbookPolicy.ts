export const MARKET_MIN_ITEM_COUNT = 100;

const MARKET_BLOCK_KEYWORDS = [
  "e2e",
  "smoke",
  "fixture",
  "seed",
  "test",
  "dummy",
  "sample",
  "imported from",
  "derived/"
];

export function shouldHideWordbookFromMarket(input: {
  title: string;
  description: string | null;
  ownerEmail: string;
  itemCount: number;
}): boolean {
  if (input.itemCount < MARKET_MIN_ITEM_COUNT) return true;

  const title = input.title.toLowerCase();
  const description = (input.description ?? "").toLowerCase();
  const ownerEmail = input.ownerEmail.toLowerCase();

  if (ownerEmail.endsWith("@local")) return true;
  if (ownerEmail === "admin@example.com") return true;

  return MARKET_BLOCK_KEYWORDS.some((kw) => title.includes(kw) || description.includes(kw));
}
