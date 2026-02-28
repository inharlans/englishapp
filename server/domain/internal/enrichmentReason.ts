export const ENRICHMENT_REASON_CODES = [
  "RATE_LIMIT",
  "TIMEOUT",
  "NETWORK",
  "PARSE_ERROR",
  "ITEM_NOT_FOUND_AFTER_CLAIM",
  "ITEM_MISSING_OR_INVALID",
  "BATCH_REQUEST_FAILED",
  "BATCH_FALLBACK_FAILED",
  "GOOGLE_TRANSLATE_FALLBACK_EMPTY",
  "UNKNOWN"
] as const;

export type EnrichmentReasonCode = (typeof ENRICHMENT_REASON_CODES)[number];

const ENRICHMENT_REASON_CODE_SET = new Set<string>(ENRICHMENT_REASON_CODES);

export function toReasonCode(value: string | null | undefined): EnrichmentReasonCode {
  const raw = String(value ?? "").trim().toUpperCase();
  if (ENRICHMENT_REASON_CODE_SET.has(raw)) {
    return raw as EnrichmentReasonCode;
  }
  return "UNKNOWN";
}

export function formatEnrichmentReason(code: EnrichmentReasonCode, detail?: string): string {
  const normalizedCode = toReasonCode(code);
  const cleanDetail = String(detail ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/:/g, "_")
    .slice(0, 240);
  return cleanDetail ? `${normalizedCode}:${cleanDetail}` : normalizedCode;
}

export function parseEnrichmentReason(raw: string | null | undefined): EnrichmentReasonCode {
  if (!raw) return "UNKNOWN";
  const prefix = raw.split(":", 1)[0] ?? "";
  return toReasonCode(prefix);
}

export function createReasonCounts(): Record<EnrichmentReasonCode, number> {
  return {
    RATE_LIMIT: 0,
    TIMEOUT: 0,
    NETWORK: 0,
    PARSE_ERROR: 0,
    ITEM_NOT_FOUND_AFTER_CLAIM: 0,
    ITEM_MISSING_OR_INVALID: 0,
    BATCH_REQUEST_FAILED: 0,
    BATCH_FALLBACK_FAILED: 0,
    GOOGLE_TRANSLATE_FALLBACK_EMPTY: 0,
    UNKNOWN: 0
  };
}

export function classifyEnrichmentError(error: unknown): EnrichmentReasonCode {
  const text = error instanceof Error ? error.message : String(error ?? "");
  const normalized = text.toLowerCase();
  if (normalized.includes("status 429") || normalized.includes("rate limit")) return "RATE_LIMIT";
  if (normalized.includes("timeout") || normalized.includes("timed out")) return "TIMEOUT";
  if (normalized.includes("network") || normalized.includes("fetch") || normalized.includes("econn")) return "NETWORK";
  if (normalized.includes("json") || normalized.includes("parse")) return "PARSE_ERROR";
  return "BATCH_REQUEST_FAILED";
}
