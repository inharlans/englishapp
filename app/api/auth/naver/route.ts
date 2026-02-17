import { NextRequest, NextResponse } from "next/server";

const OAUTH_STATE_COOKIE = "oauth_naver_state";
const OAUTH_NEXT_COOKIE = "oauth_naver_next";

function getNaverConfig(req: NextRequest): { clientId: string; redirectUri: string } | null {
  const clientId = process.env.NAVER_CLIENT_ID?.trim() ?? "";
  const configuredRedirect = process.env.NAVER_REDIRECT_URI?.trim() ?? "";
  const redirectUri = configuredRedirect || `${req.nextUrl.origin}/api/auth/naver/callback`;
  if (!clientId) return null;
  return { clientId, redirectUri };
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeNextPath(raw: string | null): string {
  if (!raw) return "/wordbooks";
  if (!raw.startsWith("/")) return "/wordbooks";
  if (raw.startsWith("//")) return "/wordbooks";
  return raw;
}

export async function GET(req: NextRequest) {
  const config = getNaverConfig(req);
  if (!config) {
    return NextResponse.redirect(new URL("/login?error=naver_not_configured", req.url));
  }

  const state = randomHex(24);
  const nextPath = safeNextPath(req.nextUrl.searchParams.get("next"));

  const authUrl = new URL("https://nid.naver.com/oauth2.0/authorize");
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10
  });
  res.cookies.set(OAUTH_NEXT_COOKIE, nextPath, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10
  });
  return res;
}
