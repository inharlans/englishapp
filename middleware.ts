import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getSessionCookieName, verifySessionToken } from "@/lib/authJwt";

const PREVIEW_COOKIE_NAME = "preview_access";

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
  if (pathname === "/") return true;
  if (pathname === "/login") return true;
  if (pathname === "/privacy") return true;
  if (pathname === "/terms") return true;
  if (pathname === "/pricing") return true;
  if (pathname === "/preview-access") return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname === "/api/payments/webhook") return true;
  if (pathname === "/api/wordbooks/market") return true;
  if (pathname === "/api/clipper/extension") return true;
  if (/^\/api\/wordbooks\/\d+\/reviews$/.test(pathname)) return true;
  if (pathname.startsWith("/api/internal/cron/")) return true;
  if (pathname === "/wordbooks/market") return true;
  if (pathname === "/clipper/extension") return true;
  if (/^\/wordbooks\/\d+$/.test(pathname)) return true;
  if (pathname.startsWith("/offline")) return true;
  if (pathname === "/sw.js") return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico") return true;
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
