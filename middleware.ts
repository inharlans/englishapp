import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

import { getSessionCookieName, verifySessionToken } from "@/lib/authJwt";

const PREVIEW_COOKIE_NAME = "preview_access";

function isCrawlerLockdownEnabled(): boolean {
  const raw = (process.env.CRAWLER_LOCKDOWN_MODE ?? "on").trim().toLowerCase();
  return raw !== "off" && raw !== "0" && raw !== "false";
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isCrawlerLockedPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  if (normalized === "/api/wordbooks/market") return true;
  if (/^\/api\/wordbooks\/\d+\/reviews$/.test(normalized)) return true;
  if (normalized === "/api/clipper/extension") return true;
  if (normalized === "/wordbooks/market") return true;
  if (/^\/wordbooks\/\d+$/.test(normalized)) return true;
  if (normalized === "/clipper/extension") return true;
  return false;
}

function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const match = authorizationHeader.match(/^\s*Bearer\s+(\S+)\s*$/i);
  return match?.[1] ?? null;
}

function isBearerAuthMode(req: NextRequest): boolean {
  return (req.headers.get("x-auth-mode") ?? "").trim().toLowerCase() === "bearer";
}

function getMobileAccessSecretForEdge(): Uint8Array | null {
  const secret = process.env.MOBILE_ACCESS_SECRET?.trim();
  if (!secret) {
    return null;
  }
  return new TextEncoder().encode(secret);
}

async function verifyMobileAccessBearerToken(token: string): Promise<boolean> {
  const secret = getMobileAccessSecretForEdge();
  if (!secret) {
    return false;
  }

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
      issuer: "mobile-access",
      audience: "mobile-api"
    });

    const userId = Number(payload.sub);
    const email = payload.email;
    const tokenType = payload.tokenType;

    if (!Number.isFinite(userId) || userId <= 0) return false;
    if (typeof email !== "string" || !email) return false;
    if (tokenType !== "mobile_access") return false;

    return true;
  } catch {
    return false;
  }
}

function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

function isLocalDebugBypass(req: NextRequest): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const bypassFlag = process.env.LOCAL_AUTH_BYPASS?.toLowerCase();
  if (bypassFlag === "false" || bypassFlag === "0") return false;
  const host = req.nextUrl.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function hasValidPreviewAccess(req: NextRequest): boolean {
  const expected = process.env.PREVIEW_ACCESS_TOKEN;
  if (!expected) return false;
  const actual = req.cookies.get(PREVIEW_COOKIE_NAME)?.value ?? "";
  return actual.length > 0 && actual === expected;
}

function isPublicPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  if (isCrawlerLockdownEnabled() && isCrawlerLockedPath(normalized)) return false;
  if (normalized === "/") return true;
  if (normalized === "/login") return true;
  if (normalized === "/privacy") return true;
  if (normalized === "/terms") return true;
  if (normalized === "/pricing") return true;
  if (normalized === "/preview-access") return true;
  if (normalized.startsWith("/api/auth/")) return true;
  if (normalized === "/api/payments/webhook") return true;
  if (normalized === "/api/wordbooks/market") return true;
  if (normalized === "/api/clipper/extension") return true;
  if (/^\/api\/wordbooks\/\d+\/reviews$/.test(normalized)) return true;
  if (normalized.startsWith("/api/internal/cron/")) return true;
  if (normalized === "/wordbooks/market") return true;
  if (normalized === "/clipper/extension") return true;
  if (/^\/wordbooks\/\d+$/.test(normalized)) return true;
  if (normalized.startsWith("/offline")) return true;
  if (normalized === "/sw.js") return true;
  if (normalized.startsWith("/_next/")) return true;
  if (normalized === "/favicon.ico") return true;
  return false;
}

export async function middleware(req: NextRequest) {
  if (req.nextUrl.hostname === "oingapp.com") {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.hostname = "www.oingapp.com";
    return NextResponse.redirect(redirectUrl, 308);
  }

  if (isLocalDebugBypass(req)) {
    return withSecurityHeaders(NextResponse.next());
  }

  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname) || hasValidPreviewAccess(req)) {
    return withSecurityHeaders(NextResponse.next());
  }

  const token = req.cookies.get(getSessionCookieName())?.value;
  const claims = token ? await verifySessionToken(token) : null;
  if (claims) {
    return withSecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/api/") && isBearerAuthMode(req)) {
    const bearerToken = extractBearerToken(req.headers.get("authorization"));
    if (bearerToken && (await verifyMobileAccessBearerToken(bearerToken))) {
      return withSecurityHeaders(NextResponse.next());
    }
  }

  if (pathname.startsWith("/api/")) {
    return withSecurityHeaders(NextResponse.json({ error: "Unauthorized." }, { status: 401 }));
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return withSecurityHeaders(NextResponse.redirect(loginUrl));
}

export const config = {
  matcher: ["/((?!.*\\.).*)"]
};
