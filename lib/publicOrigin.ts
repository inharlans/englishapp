import { NextRequest } from "next/server";

function stripTrailingSlash(input: string): string {
  return input.replace(/\/+$/, "");
}

function getForwardedHeaderValue(value: string | null): string {
  if (!value) return "";
  return value.split(",")[0]?.trim() ?? "";
}

function isLocalHost(hostOrOrigin: string): boolean {
  const v = hostOrOrigin.toLowerCase();
  return v.includes("localhost") || v.includes("127.0.0.1");
}

export function getPublicOrigin(req: NextRequest): string {
  const requestOrigin = getForwardedHeaderValue(req.headers.get("origin"));
  if (requestOrigin) {
    try {
      const origin = stripTrailingSlash(new URL(requestOrigin).origin);
      if (!isLocalHost(origin)) {
        return origin;
      }
    } catch {
      // Ignore invalid origin header and continue.
    }
  }

  const forwardedHost = getForwardedHeaderValue(req.headers.get("x-forwarded-host"));
  const forwardedProto = getForwardedHeaderValue(req.headers.get("x-forwarded-proto")) || "https";
  const forwardedOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : "";

  const configured = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (configured) {
    try {
      const configuredOrigin = stripTrailingSlash(new URL(configured).origin);
      if (isLocalHost(configuredOrigin) && forwardedOrigin && !isLocalHost(forwardedOrigin)) {
        return forwardedOrigin;
      }
      return configuredOrigin;
    } catch {
      // Ignore invalid env value and continue with header-based fallback.
    }
  }

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = (req.headers.get("host") ?? "").trim();
  if (host) {
    const protocol = req.nextUrl.protocol || "https:";
    return `${protocol}//${host}`;
  }

  return req.nextUrl.origin;
}
