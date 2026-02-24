function isFalseLike(value: string | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "false" || normalized === "0" || normalized === "off";
}

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function parseHostnameFromHostHeader(rawHost: string | null): string {
  if (!rawHost) return "";
  const host = rawHost.trim().toLowerCase();
  if (!host) return "";
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    return end >= 0 ? host.slice(1, end) : host;
  }
  return host.split(":")[0] ?? host;
}

export function isLocalDebugBypassEnabledByHostname(hostname: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (isFalseLike(process.env.LOCAL_AUTH_BYPASS)) return false;
  return isLocalHost(hostname.toLowerCase());
}

export function isLocalDebugBypassEnabledByHostHeader(hostHeader: string | null): boolean {
  const hostname = parseHostnameFromHostHeader(hostHeader);
  return isLocalDebugBypassEnabledByHostname(hostname);
}

export function getLocalDebugEmail(): string {
  return process.env.LOCAL_DEBUG_EMAIL ?? "debug@local.oingapp";
}

export function normalizeSafeNextPath(raw: string | null): string {
  if (!raw) return "/wordbooks";
  if (!raw.startsWith("/")) return "/wordbooks";
  if (raw.startsWith("//")) return "/wordbooks";
  return raw;
}
