import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

type Bucket = {
  count: number;
  resetAtMs: number;
};

const globalForRateLimit = globalThis as unknown as {
  __rateLimitBuckets?: Map<string, Bucket>;
  __upstashRatelimitByConfig?: Map<string, Ratelimit>;
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

export function checkRateLimitLocal(input: {
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

function getUpstashRatelimit(input: { limit: number; windowMs: number }): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return null;
  }

  const seconds = Math.max(Math.round(input.windowMs / 1000), 1);
  const key = `${input.limit}:${seconds}`;

  if (!globalForRateLimit.__upstashRatelimitByConfig) {
    globalForRateLimit.__upstashRatelimitByConfig = new Map();
  }

  const existing = globalForRateLimit.__upstashRatelimitByConfig.get(key);
  if (existing) {
    return existing;
  }

  const redis = new Redis({ url, token });
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(input.limit, `${seconds} s`),
    analytics: false
  });
  globalForRateLimit.__upstashRatelimitByConfig.set(key, ratelimit);
  return ratelimit;
}

export async function checkRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const upstash = getUpstashRatelimit(input);
  if (!upstash) {
    return checkRateLimitLocal(input);
  }

  const { success, reset } = await upstash.limit(input.key);
  if (success) return { ok: true };
  return { ok: false, retryAfterSeconds: Math.max(Math.ceil((reset - Date.now()) / 1000), 1) };
}
