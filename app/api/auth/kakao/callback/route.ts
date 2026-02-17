import { NextRequest, NextResponse } from "next/server";

import { getSessionCookieName, issueSessionToken } from "@/lib/authJwt";
import { getCsrfCookieName, issueCsrfToken } from "@/lib/csrf";
import { captureAppError, recordApiMetricFromStart } from "@/lib/observability";
import { resolveOrLinkOAuthUser } from "@/lib/oauthAccounts";
import { getPublicOrigin } from "@/lib/publicOrigin";

const OAUTH_STATE_COOKIE = "oauth_kakao_state";
const OAUTH_NEXT_COOKIE = "oauth_kakao_next";

function getKakaoConfig(req: NextRequest): { clientId: string; clientSecret: string; redirectUri: string } | null {
  const clientId = process.env.KAKAO_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.KAKAO_CLIENT_SECRET?.trim() ?? "";
  const configuredRedirect = process.env.KAKAO_REDIRECT_URI?.trim() ?? "";
  const redirectUri = configuredRedirect || `${getPublicOrigin(req)}/api/auth/kakao/callback`;
  if (!clientId) return null;
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

type KakaoProfile = {
  id?: number | string;
  kakao_account?: {
    email?: string;
    is_email_valid?: boolean;
    is_email_verified?: boolean;
  };
};

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const redirectWithMetric = async (code: string) => {
    const res = redirectWithError(req, code);
    await recordApiMetricFromStart({
      route: "/api/auth/kakao/callback",
      method: "GET",
      status: 307,
      startedAt
    });
    return res;
  };

  const config = getKakaoConfig(req);
  if (!config) return redirectWithMetric("kakao_not_configured");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const stateCookie = req.cookies.get(OAUTH_STATE_COOKIE)?.value ?? "";
  const nextPath = safeNextPath(req.cookies.get(OAUTH_NEXT_COOKIE)?.value);

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return redirectWithMetric("kakao_state_mismatch");
  }

  try {
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      code
    });
    if (config.clientSecret) tokenBody.set("client_secret", config.clientSecret);

    const tokenRes = await fetchWithTimeout("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody
    });
    if (!tokenRes.ok) return redirectWithMetric("kakao_token_exchange_failed");

    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenJson.access_token;
    if (!accessToken) return redirectWithMetric("kakao_token_missing");

    const profileRes = await fetchWithTimeout("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!profileRes.ok) return redirectWithMetric("kakao_profile_fetch_failed");
    const profile = (await profileRes.json()) as KakaoProfile;

    const providerUserId = String(profile.id ?? "").trim();
    const emailRaw = (profile.kakao_account?.email ?? "").trim().toLowerCase();
    const email =
      emailRaw &&
      profile.kakao_account?.is_email_valid === true &&
      profile.kakao_account?.is_email_verified === true
        ? emailRaw
        : null;

    const resolved = await resolveOrLinkOAuthUser({
      provider: "kakao",
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
      route: "/api/auth/kakao/callback",
      method: "GET",
      status: 307,
      startedAt,
      userId: resolved.user.id
    });
    return res;
  } catch (error) {
    await captureAppError({
      route: "/api/auth/kakao/callback",
      message: "kakao_callback_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: { err: error instanceof Error ? error.message : String(error) }
    });
    return redirectWithMetric("kakao_callback_failed");
  }
}
