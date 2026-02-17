import { NextRequest, NextResponse } from "next/server";

import { getSessionCookieName, issueSessionToken } from "@/lib/authJwt";
import { getCsrfCookieName, issueCsrfToken } from "@/lib/csrf";
import { resolveOrLinkOAuthUser } from "@/lib/oauthAccounts";

const OAUTH_STATE_COOKIE = "oauth_kakao_state";
const OAUTH_NEXT_COOKIE = "oauth_kakao_next";

function getKakaoConfig(req: NextRequest): { clientId: string; clientSecret: string; redirectUri: string } | null {
  const clientId = process.env.KAKAO_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.KAKAO_CLIENT_SECRET?.trim() ?? "";
  const configuredRedirect = process.env.KAKAO_REDIRECT_URI?.trim() ?? "";
  const redirectUri = configuredRedirect || `${req.nextUrl.origin}/api/auth/kakao/callback`;
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
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(code)}`, req.url));
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
  const config = getKakaoConfig(req);
  if (!config) return redirectWithError(req, "kakao_not_configured");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const stateCookie = req.cookies.get(OAUTH_STATE_COOKIE)?.value ?? "";
  const nextPath = safeNextPath(req.cookies.get(OAUTH_NEXT_COOKIE)?.value);

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return redirectWithError(req, "kakao_state_mismatch");
  }

  try {
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      code
    });
    if (config.clientSecret) tokenBody.set("client_secret", config.clientSecret);

    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody
    });
    if (!tokenRes.ok) return redirectWithError(req, "kakao_token_exchange_failed");

    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenJson.access_token;
    if (!accessToken) return redirectWithError(req, "kakao_token_missing");

    const profileRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!profileRes.ok) return redirectWithError(req, "kakao_profile_fetch_failed");
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
    if (!resolved.ok) return redirectWithError(req, resolved.errorCode);

    const sessionToken = await issueSessionToken({
      userId: resolved.user.id,
      email: resolved.user.email,
      ttlSeconds: 60 * 60 * 24 * 30
    });
    const csrfToken = issueCsrfToken();

    const res = NextResponse.redirect(new URL(nextPath, req.url));
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
    return res;
  } catch {
    return redirectWithError(req, "kakao_callback_failed");
  }
}
