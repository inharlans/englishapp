type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

export function getClipperMetricsCacheMode(): "no-cache" | "ttl-5m" {
  const mode = (process.env.CLIPPER_METRICS_CACHE_MODE ?? "").toLowerCase();
  if (mode === "5m" || mode === "ttl-5m") return "ttl-5m";
  const ttl = Number.parseInt(process.env.CLIPPER_METRICS_CACHE_TTL_SECONDS ?? "0", 10) || 0;
  if (ttl >= 300) return "ttl-5m";
  return "no-cache";
}

export function getClipperMetricsCacheTtlSec(): number {
  const mode = (process.env.CLIPPER_METRICS_CACHE_MODE ?? "").toLowerCase();
  if (mode === "5m" || mode === "ttl-5m") return 300;
  const ttl = Number.parseInt(process.env.CLIPPER_METRICS_CACHE_TTL_SECONDS ?? "0", 10) || 0;
  return ttl >= 300 ? ttl : 0;
}

export function getCachedClipperMetrics<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCachedClipperMetrics<T>(key: string, value: T, ttlSec: number): void {
  if (ttlSec <= 0) return;
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlSec * 1000
  });
}
