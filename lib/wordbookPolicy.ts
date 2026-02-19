export const MARKET_MIN_ITEM_COUNT = 100;

const MARKET_BLOCK_KEYWORDS_IN_TITLE = [
  "e2e",
  "smoke",
  "fixture",
  "seed",
  "test",
  "dummy",
  "sample"
];

export function shouldHideWordbookFromMarket(input: {
  title: string;
  description: string | null;
  ownerEmail: string;
  itemCount: number;
}): boolean {
  if (input.itemCount < MARKET_MIN_ITEM_COUNT) return true;

  const title = input.title.toLowerCase();

  // Keep market quality filters focused on obvious test titles only.
  // Description may include import metadata for curated decks.
  return MARKET_BLOCK_KEYWORDS_IN_TITLE.some((kw) => title.includes(kw));
}
