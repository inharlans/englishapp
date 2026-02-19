const BROKEN_ONLY_RE = /^[?\uFFFD\s]+$/;

export function isBrokenUserText(value: string | null | undefined): boolean {
  const normalized = (value ?? "").trim();
  if (!normalized) return false;
  if (BROKEN_ONLY_RE.test(normalized)) return true;
  if (normalized.includes("\uFFFD")) return true;
  return false;
}

export function sanitizeUserText(value: string | null | undefined, fallback: string): string {
  if (!value) return "";
  return isBrokenUserText(value) ? fallback : value;
}

export function maskEmailAddress(email: string): string {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  if (name.length <= 2) return `${name[0] ?? "*"}*@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
}

const EMAIL_RE = /([A-Za-z0-9._%+-]{1,64})@([A-Za-z0-9.-]{1,255})\.[A-Za-z]{2,24}/g;
const TOKEN_RE = /\b(?:bearer\s+)?[A-Za-z0-9_-]{20,}\b/gi;

export function maskSensitiveText(input: string): string {
  return input
    .replace(EMAIL_RE, (raw) => maskEmailAddress(raw))
    .replace(TOKEN_RE, (raw) => `${raw.slice(0, 4)}***`);
}

export function maskSensitiveUnknown(value: unknown): unknown {
  if (typeof value === "string") return maskSensitiveText(value);
  if (Array.isArray(value)) return value.map((v) => maskSensitiveUnknown(v));
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, maskSensitiveUnknown(v)]);
    return Object.fromEntries(entries);
  }
  return value;
}
