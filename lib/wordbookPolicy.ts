export const MARKET_MIN_ITEM_COUNT = 100;
export const MARKET_CURATED_MIN_DONE_RATIO = 0.8;
export const MARKET_CURATED_MIN_RATING_COUNT = 3;

export const MARKET_BLOCK_KEYWORDS_IN_TITLE = [
  "e2e",
  "smoke",
  "fixture",
  "seed",
  "test",
  "dummy",
  "sample"
];

export function isBelowMarketMinItemCount(itemCount: number): boolean {
  return itemCount < MARKET_MIN_ITEM_COUNT;
}

export function isMarketTitleBlocked(title: string): boolean {
  const normalizedTitle = title.toLowerCase();
  return MARKET_BLOCK_KEYWORDS_IN_TITLE.some((kw) => normalizedTitle.includes(kw));
}

export function shouldHideWordbookFromMarket(input: {
  title: string;
  itemCount: number;
}): boolean {
  // Keep market quality filters focused on obvious test titles only.
  // Description may include import metadata for curated decks.
  return isBelowMarketMinItemCount(input.itemCount) || isMarketTitleBlocked(input.title);
}
