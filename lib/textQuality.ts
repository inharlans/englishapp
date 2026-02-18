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

