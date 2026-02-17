import { NextRequest, NextResponse } from "next/server";

import { getSessionCookieName, issueSessionToken } from "@/lib/authJwt";
import { getCsrfCookieName, issueCsrfToken } from "@/lib/csrf";
import { captureAppError, recordApiMetricFromStart } from "@/lib/observability";
import { resolveOrLinkOAuthUser } from "@/lib/oauthAccounts";
import { getPublicOrigin } from "@/lib/publicOrigin";

const OAUTH_STATE_COOKIE = "oauth_naver_state";
const OAUTH_NEXT_COOKIE = "oauth_naver_next";

function getNaverConfig(req: NextRequest): { clientId: string; clientSecret: string; redirectUri: string } | null {
  const clientId = process.env.NAVER_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim() ?? "";
  const configuredRedirect = process.env.NAVER_REDIRECT_URI?.trim() ?? "";
  const redirectUri = configuredRedirect || `${getPublicOrigin(req)}/api/auth/naver/callback`;
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

type NaverUserInfo = {
  resultcode?: string;
  response?: {
    id?: string;
    email?: string;
  };
};

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const redirectWithMetric = async (code: string) => {
    const res = redirectWithError(req, code);
    await recordApiMetricFromStart({
      route: "/api/auth/naver/callback",
      method: "GET",
      status: 307,
      startedAt
    });
    return res;
  };

  const config = getNaverConfig(req);
  if (!config) return redirectWithMetric("naver_not_configured");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const stateCookie = req.cookies.get(OAUTH_STATE_COOKIE)?.value ?? "";
  const nextPath = safeNextPath(req.cookies.get(OAUTH_NEXT_COOKIE)?.value);

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return redirectWithMetric("naver_state_mismatch");
  }

  try {
    const tokenUrl = new URL("https://nid.naver.com/oauth2.0/token");
    tokenUrl.searchParams.set("grant_type", "authorization_code");
    tokenUrl.searchParams.set("client_id", config.clientId);
    tokenUrl.searchParams.set("client_secret", config.clientSecret);
    tokenUrl.searchParams.set("code", code);
    tokenUrl.searchParams.set("state", state);

    const tokenRes = await fetchWithTimeout(tokenUrl.toString());
    if (!tokenRes.ok) return redirectWithMetric("naver_token_exchange_failed");
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenJson.access_token;
    if (!accessToken) return redirectWithMetric("naver_token_missing");

    const profileRes = await fetchWithTimeout("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!profileRes.ok) return redirectWithMetric("naver_profile_fetch_failed");
    const profile = (await profileRes.json()) as NaverUserInfo;
    if (profile.resultcode !== "00") return redirectWithMetric("naver_profile_fetch_failed");

    const providerUserId = (profile.response?.id ?? "").trim();
    const email = (profile.response?.email ?? "").trim().toLowerCase() || null;
    const resolved = await resolveOrLinkOAuthUser({
      provider: "naver",
      providerUserId,
      email,
      cookies: req.cookies
    });
    if (!resolved.ok) return redirectWithMetric(resolved.errorCode);

    const sessionToken = await issueSessionToken({
      userId: resolved.user.id,
      email: resolved.user.email,
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
      route: "/api/auth/naver/callback",
      method: "GET",
      status: 307,
      startedAt,
      userId: resolved.user.id
    });
    return res;
  } catch (error) {
    await captureAppError({
      route: "/api/auth/naver/callback",
      message: "naver_callback_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: { err: error instanceof Error ? error.message : String(error) }
    });
    return redirectWithMetric("naver_callback_failed");
  }
}
