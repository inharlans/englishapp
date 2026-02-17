import { NextRequest, NextResponse } from "next/server";

const OAUTH_STATE_COOKIE = "oauth_google_state";
const OAUTH_NEXT_COOKIE = "oauth_google_next";

function getGoogleConfig(req: NextRequest): { clientId: string; redirectUri: string; redirectOrigin: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const configuredRedirect = process.env.GOOGLE_REDIRECT_URI?.trim() ?? "";
  const redirectUri = configuredRedirect || `${req.nextUrl.origin}/api/auth/google/callback`;
  if (!clientId) return null;
  let redirectOrigin = req.nextUrl.origin;
  try {
    redirectOrigin = new URL(redirectUri).origin;
  } catch {
    redirectOrigin = req.nextUrl.origin;
  }
  return { clientId, redirectUri, redirectOrigin };
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
  const config = getGoogleConfig(req);
  if (!config) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", req.url));
  }

  if (config.redirectOrigin !== req.nextUrl.origin) {
    const canonical = new URL(req.nextUrl.pathname + req.nextUrl.search, config.redirectOrigin);
    return NextResponse.redirect(canonical);
  }

  const state = randomHex(24);
  const nextPath = safeNextPath(req.nextUrl.searchParams.get("next"));

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

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
