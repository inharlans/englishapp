import { NextRequest, NextResponse } from "next/server";

import { getSessionCookieName, issueSessionToken } from "@/lib/authJwt";
import { getCsrfCookieName, issueCsrfToken } from "@/lib/csrf";
import { captureAppError, recordApiMetricFromStart } from "@/lib/observability";
import { resolveOrLinkOAuthUser } from "@/lib/oauthAccounts";
import { getPublicOrigin } from "@/lib/publicOrigin";

const OAUTH_STATE_COOKIE = "oauth_google_state";
const OAUTH_NEXT_COOKIE = "oauth_google_next";

function getGoogleConfig(req: NextRequest): { clientId: string; clientSecret: string; redirectUri: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
  const configuredRedirect = process.env.GOOGLE_REDIRECT_URI?.trim() ?? "";
  const redirectUri = configuredRedirect || `${getPublicOrigin(req)}/api/auth/google/callback`;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri };
}

function safeNextPath(raw: string | undefined): string {
  if (!raw) return "/wordbooks";
  if (!raw.startsWith("/")) return "/wordbooks";
  if (raw.startsWith("//")) return "/wordbooks";
  return raw;
}

function redirectWithError(req: NextRequest, code: string): NextResponse {
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(code)}`, getPublicOrigin(req)));
}

async function fetchWithTimeout(input: string, init?: RequestInit, timeoutMs = 10000): Promise<Response> {
  return fetch(input, {
    ...(init ?? {}),
    signal: AbortSignal.timeout(timeoutMs)
  });
}

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
};

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const redirectWithMetric = async (code: string) => {
    const res = redirectWithError(req, code);
    await recordApiMetricFromStart({
      route: "/api/auth/google/callback",
      method: "GET",
      status: 307,
      startedAt
    });
    return res;
  };

  const config = getGoogleConfig(req);
  if (!config) return redirectWithMetric("google_not_configured");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const stateCookie = req.cookies.get(OAUTH_STATE_COOKIE)?.value ?? "";
  const nextPath = safeNextPath(req.cookies.get(OAUTH_NEXT_COOKIE)?.value);

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return redirectWithMetric("google_state_mismatch");
  }

  try {
    const tokenRes = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code"
      })
    });
    if (!tokenRes.ok) return redirectWithMetric("google_token_exchange_failed");

    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenJson.access_token;
    if (!accessToken) return redirectWithMetric("google_token_missing");

    const profileRes = await fetchWithTimeout("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!profileRes.ok) return redirectWithMetric("google_profile_fetch_failed");

    const profile = (await profileRes.json()) as GoogleUserInfo;
    const email = (profile.email ?? "").trim().toLowerCase();
    if (!email || profile.email_verified !== true) {
      return redirectWithMetric("google_email_not_verified");
    }

    const providerUserId = (profile.sub ?? "").trim();
    const resolved = await resolveOrLinkOAuthUser({
      provider: "google",
      providerUserId,
      email,
      cookies: req.cookies
    });
    if (!resolved.ok) return redirectWithMetric(resolved.errorCode);
    const user = resolved.user;

    const sessionToken = await issueSessionToken({
      userId: user.id,
      email: user.email,
      ttlSeconds: 60 * 60 * 24 * 30
    });
    const csrfToken = issueCsrfToken();

    const res = NextResponse.redirect(new URL(nextPath, getPublicOrigin(req)));
    res.cookies.set(getSessionCookieName(), sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
    res.cookies.set(getCsrfCookieName(), csrfToken, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
    res.cookies.set(OAUTH_STATE_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0
    });
    res.cookies.set(OAUTH_NEXT_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0
    });
    await recordApiMetricFromStart({
      route: "/api/auth/google/callback",
      method: "GET",
      status: 307,
      startedAt,
      userId: user.id
    });
    return res;
  } catch (error) {
    await captureAppError({
      route: "/api/auth/google/callback",
      message: "google_callback_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: { err: error instanceof Error ? error.message : String(error) }
    });
    return redirectWithMetric("google_callback_failed");
  }
}
