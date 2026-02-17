import { NextRequest } from "next/server";

function stripTrailingSlash(input: string): string {
  return input.replace(/\/+$/, "");
}

function getForwardedHeaderValue(value: string | null): string {
  if (!value) return "";
  return value.split(",")[0]?.trim() ?? "";
}

export function getPublicOrigin(req: NextRequest): string {
  const configured = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (configured) {
    try {
      return stripTrailingSlash(new URL(configured).origin);
    } catch {
      // Ignore invalid env value and continue with header-based fallback.
    }
  }

  const forwardedHost = getForwardedHeaderValue(req.headers.get("x-forwarded-host"));
  if (forwardedHost) {
    const forwardedProto = getForwardedHeaderValue(req.headers.get("x-forwarded-proto")) || "https";
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = (req.headers.get("host") ?? "").trim();
  if (host) {
    const protocol = req.nextUrl.protocol || "https:";
    return `${protocol}//${host}`;
  }

  return req.nextUrl.origin;
}
