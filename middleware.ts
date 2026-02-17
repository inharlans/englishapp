import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getSessionCookieName, verifySessionToken } from "@/lib/authJwt";

const PREVIEW_COOKIE_NAME = "preview_access";

function hasValidPreviewAccess(req: NextRequest): boolean {
  const expected = process.env.PREVIEW_ACCESS_TOKEN;
  if (!expected) return false;
  const actual = req.cookies.get(PREVIEW_COOKIE_NAME)?.value ?? "";
  return actual.length > 0 && actual === expected;
}

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/login") return true;
  if (pathname === "/preview-access") return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname === "/api/payments/webhook") return true;
  if (pathname === "/api/wordbooks/market") return true;
  if (/^\/api\/wordbooks\/\d+\/reviews$/.test(pathname)) return true;
  if (pathname.startsWith("/api/internal/cron/")) return true;
  if (pathname === "/wordbooks/market") return true;
  if (/^\/wordbooks\/\d+$/.test(pathname)) return true;
  if (pathname.startsWith("/offline")) return true;
  if (pathname === "/sw.js") return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico") return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname) || hasValidPreviewAccess(req)) {
    const res = NextResponse.next();
    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    return res;
  }

  const token = req.cookies.get(getSessionCookieName())?.value;
  const claims = token ? await verifySessionToken(token) : null;
  if (claims) {
    const res = NextResponse.next();
    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    return res;
  }

  if (pathname.startsWith("/api/")) {
    const res = NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    return res;
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  const res = NextResponse.redirect(loginUrl);
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

export const config = {
  matcher: ["/((?!.*\\.).*)"]
};
