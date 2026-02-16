type StudyView = "memorize" | "listCorrect" | "listWrong" | "listHalf";

type PartStat = {
  partIndex: number;
  totalInPart: number;
  matchedCount: number;
};

type CacheEntry = {
  expiresAt: number;
  value: PartStat[];
};

const DEFAULT_TTL_MS = 30_000;

function getStore(): Map<string, CacheEntry> {
  const g = globalThis as typeof globalThis & {
    __studyPartStatsCache__?: Map<string, CacheEntry>;
  };
  if (!g.__studyPartStatsCache__) {
    g.__studyPartStatsCache__ = new Map<string, CacheEntry>();
  }
  return g.__studyPartStatsCache__;
}

export function makeStudyPartStatsCacheKey(input: {
  userId: number;
  wordbookId: number;
  view: StudyView;
  hideCorrect: boolean;
  q: string;
  partSize: number;
}): string {
  return [
    input.userId,
    input.wordbookId,
    input.view,
    input.hideCorrect ? "1" : "0",
    input.partSize,
    input.q.toLowerCase()
  ].join("|");
}

export function getStudyPartStatsFromCache(key: string): PartStat[] | null {
  const store = getStore();
  const cached = store.get(key);
  if (!cached) return null;
  if (Date.now() >= cached.expiresAt) {
    store.delete(key);
    return null;
  }
  return cached.value.map((v) => ({ ...v }));
}

export function setStudyPartStatsCache(key: string, value: PartStat[], ttlMs = DEFAULT_TTL_MS): void {
  const store = getStore();
  store.set(key, {
    expiresAt: Date.now() + Math.max(1_000, ttlMs),
    value: value.map((v) => ({ ...v }))
  });
}

export function invalidateStudyPartStatsCacheForWordbook(userId: number, wordbookId: number): void {
  const store = getStore();
  const prefix = `${userId}|${wordbookId}|`;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

