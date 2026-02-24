export const CLIPPER_TERM_MAX_LEN = 64;
export const CLIPPER_EXAMPLE_MAX_LEN = 500;
export const CLIPPER_AI_EXAMPLE_MAX_LEN = 200;

const EDGE_PUNCT_RE = /^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu;
const SPACE_RE = /\s+/g;
const URL_RE = /(https?:\/\/|www\.)/i;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const BANNED_WORDS = [/fuck/i, /shit/i, /nigger/i];

export function clampLength(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return value.slice(0, maxLen);
}

export function normalizeWhitespace(value: string): string {
  return value.replace(SPACE_RE, " ").trim();
}

export function normalizeTermForKey(term: string): string {
  const normalized = normalizeWhitespace(term).replace(EDGE_PUNCT_RE, "");
  return normalized.toLowerCase();
}

export function sanitizeTermInput(term: string): string {
  return clampLength(normalizeWhitespace(term), CLIPPER_TERM_MAX_LEN);
}

export function sanitizeExampleInput(example: string): string {
  return clampLength(normalizeWhitespace(example), CLIPPER_EXAMPLE_MAX_LEN);
}

export function isUnsafeAiExample(example: string): boolean {
  if (!example) return true;
  if (example.length > CLIPPER_AI_EXAMPLE_MAX_LEN) return true;
  if (URL_RE.test(example) || EMAIL_RE.test(example)) return true;
  return BANNED_WORDS.some((pattern) => pattern.test(example));
}

