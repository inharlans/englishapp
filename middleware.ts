import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getSessionCookieName, verifySessionToken } from "@/lib/authJwt";
import {
  PREVIEW_BYPASS_COOKIE,
  PREVIEW_BYPASS_TTL_SECONDS,
  isPreviewBypassAllowed
} from "@/lib/previewBypass";

function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname.startsWith("/api/internal/cron/")) return true;
  if (pathname.startsWith("/offline")) return true;
  if (pathname === "/sw.js") return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico") return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const previewBypassToken = process.env.PREVIEW_BYPASS_TOKEN?.trim() || "";

  if (pathname === "/preview-access") {
    if (!isPreviewBypassAllowed()) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Preview bypass is disabled." }, { status: 503 })
      );
    }

    const token = req.nextUrl.searchParams.get("token") ?? "";
    if (token !== previewBypassToken) {
      return applySecurityHeaders(NextResponse.json({ error: "Invalid preview token." }, { status: 401 }));
    }

    const nextRaw = req.nextUrl.searchParams.get("next") ?? "/";
    const nextPath = nextRaw.startsWith("/") ? nextRaw : "/";
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = nextPath;
    redirectUrl.search = "";

    const res = NextResponse.redirect(redirectUrl);
    res.cookies.set({
      name: PREVIEW_BYPASS_COOKIE,
      value: "1",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: PREVIEW_BYPASS_TTL_SECONDS
    });
    return applySecurityHeaders(res);
  }

  if (isPublicPath(pathname)) {
    return applySecurityHeaders(NextResponse.next());
  }

  const hasPreviewBypass = req.cookies.get(PREVIEW_BYPASS_COOKIE)?.value === "1";
  if (hasPreviewBypass) {
    return applySecurityHeaders(NextResponse.next());
  }

  const token = req.cookies.get(getSessionCookieName())?.value;
  const claims = token ? await verifySessionToken(token) : null;
  if (claims) {
    return applySecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/api/")) {
    return applySecurityHeaders(NextResponse.json({ error: "Unauthorized." }, { status: 401 }));
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return applySecurityHeaders(NextResponse.redirect(loginUrl));
}

export const config = {
  matcher: ["/((?!.*\\.).*)"]
};
