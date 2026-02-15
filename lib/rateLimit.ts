type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

type Bucket = {
  count: number;
  resetAtMs: number;
};

const globalForRateLimit = globalThis as unknown as {
  __rateLimitBuckets?: Map<string, Bucket>;
};

function getBuckets(): Map<string, Bucket> {
  if (!globalForRateLimit.__rateLimitBuckets) {
    globalForRateLimit.__rateLimitBuckets = new Map();
  }
  return globalForRateLimit.__rateLimitBuckets;
}

export function getClientIpFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  const cf = headers.get("cf-connecting-ip");
  if (cf) {
    return cf.trim();
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "unknown";
}

export function checkRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  nowMs?: number;
}): RateLimitResult {
  const now = input.nowMs ?? Date.now();
  const buckets = getBuckets();
  const existing = buckets.get(input.key);

  if (!existing || existing.resetAtMs <= now) {
    buckets.set(input.key, { count: 1, resetAtMs: now + input.windowMs });
    return { ok: true };
  }

  if (existing.count >= input.limit) {
    const retryAfterSeconds = Math.max(Math.ceil((existing.resetAtMs - now) / 1000), 1);
    return { ok: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { ok: true };
}

