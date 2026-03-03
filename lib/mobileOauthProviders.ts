import { MobileAuthError } from "@/lib/mobileAuthErrors";
import type { OAuthProvider } from "@/lib/mobileAuthSchemas";

type ProviderConfig = {
  clientId: string;
  clientSecret: string;
};

type ProviderProfile = {
  providerUserId: string;
  email: string | null;
  emailVerified?: boolean;
};

async function fetchWithTimeout(input: string, init?: RequestInit, timeoutMs = 10000): Promise<Response> {
  return fetch(input, {
    ...(init ?? {}),
    signal: AbortSignal.timeout(timeoutMs)
  });
}

function getProviderConfig(provider: OAuthProvider): ProviderConfig {
  if (provider === "google") {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
    if (!clientId || !clientSecret) {
      throw new MobileAuthError(500, "AUTH_PROVIDER_CONFIG_MISSING", "google oauth 설정이 누락되었습니다.");
    }
    return { clientId, clientSecret };
  }

  if (provider === "naver") {
    const clientId = process.env.NAVER_CLIENT_ID?.trim() ?? "";
    const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim() ?? "";
    if (!clientId || !clientSecret) {
      throw new MobileAuthError(500, "AUTH_PROVIDER_CONFIG_MISSING", "naver oauth 설정이 누락되었습니다.");
    }
    return { clientId, clientSecret };
  }

  const clientId = process.env.KAKAO_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.KAKAO_CLIENT_SECRET?.trim() ?? "";
  if (!clientId) {
    throw new MobileAuthError(500, "AUTH_PROVIDER_CONFIG_MISSING", "kakao oauth 설정이 누락되었습니다.");
  }
  return { clientId, clientSecret };
}

export function buildAuthorizationUrl(input: {
  provider: OAuthProvider;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
}): string {
  const config = getProviderConfig(input.provider);

  if (input.provider === "google") {
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", config.clientId);
    authUrl.searchParams.set("redirect_uri", input.redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("state", input.state);
    authUrl.searchParams.set("code_challenge", input.codeChallenge);
    authUrl.searchParams.set("code_challenge_method", input.codeChallengeMethod);
    authUrl.searchParams.set("prompt", "select_account");
    return authUrl.toString();
  }

  if (input.provider === "naver") {
    const authUrl = new URL("https://nid.naver.com/oauth2.0/authorize");
    authUrl.searchParams.set("client_id", config.clientId);
    authUrl.searchParams.set("redirect_uri", input.redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", input.state);
    authUrl.searchParams.set("code_challenge", input.codeChallenge);
    authUrl.searchParams.set("code_challenge_method", input.codeChallengeMethod);
    return authUrl.toString();
  }

  const authUrl = new URL("https://kauth.kakao.com/oauth/authorize");
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", input.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "account_email");
  authUrl.searchParams.set("state", input.state);
  authUrl.searchParams.set("code_challenge", input.codeChallenge);
  authUrl.searchParams.set("code_challenge_method", input.codeChallengeMethod);
  return authUrl.toString();
}

export async function exchangeCodeForProviderToken(input: {
  provider: OAuthProvider;
  code: string;
  state?: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<{ accessToken: string }> {
  const config = getProviderConfig(input.provider);

  if (input.provider === "google") {
    const tokenRes = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: input.code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: input.redirectUri,
        code_verifier: input.codeVerifier,
        grant_type: "authorization_code"
      })
    });
    if (!tokenRes.ok) {
      throw new MobileAuthError(401, "AUTH_EXCHANGE_FAILED", "provider 토큰 교환에 실패했습니다.");
    }
    const json = (await tokenRes.json()) as { access_token?: string };
    if (!json.access_token) {
      throw new MobileAuthError(401, "AUTH_EXCHANGE_FAILED", "provider access_token이 누락되었습니다.");
    }
    return { accessToken: json.access_token };
  }

  if (input.provider === "naver") {
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: input.redirectUri,
      code: input.code,
      code_verifier: input.codeVerifier
    });
    if (input.state) {
      tokenBody.set("state", input.state);
    }

    const tokenRes = await fetchWithTimeout("https://nid.naver.com/oauth2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody
    });
    if (!tokenRes.ok) {
      throw new MobileAuthError(401, "AUTH_EXCHANGE_FAILED", "provider 토큰 교환에 실패했습니다.");
    }
    const json = (await tokenRes.json()) as { access_token?: string };
    if (!json.access_token) {
      throw new MobileAuthError(401, "AUTH_EXCHANGE_FAILED", "provider access_token이 누락되었습니다.");
    }
    return { accessToken: json.access_token };
  }

  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    redirect_uri: input.redirectUri,
    code: input.code,
    code_verifier: input.codeVerifier
  });
  if (config.clientSecret) {
    tokenBody.set("client_secret", config.clientSecret);
  }

  const tokenRes = await fetchWithTimeout("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody
  });
  if (!tokenRes.ok) {
    throw new MobileAuthError(401, "AUTH_EXCHANGE_FAILED", "provider 토큰 교환에 실패했습니다.");
  }
  const json = (await tokenRes.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new MobileAuthError(401, "AUTH_EXCHANGE_FAILED", "provider access_token이 누락되었습니다.");
  }
  return { accessToken: json.access_token };
}

export async function fetchProviderProfile(input: {
  provider: OAuthProvider;
  accessToken: string;
}): Promise<ProviderProfile> {
  if (input.provider === "google") {
    const profileRes = await fetchWithTimeout("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${input.accessToken}` }
    });
    if (!profileRes.ok) {
      throw new MobileAuthError(401, "AUTH_PROFILE_FAILED", "provider 프로필 조회에 실패했습니다.");
    }
    const profile = (await profileRes.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
    };
    return {
      providerUserId: (profile.sub ?? "").trim(),
      email: (profile.email ?? "").trim().toLowerCase() || null,
      emailVerified: profile.email_verified === true
    };
  }

  if (input.provider === "naver") {
    const profileRes = await fetchWithTimeout("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${input.accessToken}` }
    });
    if (!profileRes.ok) {
      throw new MobileAuthError(401, "AUTH_PROFILE_FAILED", "provider 프로필 조회에 실패했습니다.");
    }
    const profile = (await profileRes.json()) as {
      resultcode?: string;
      response?: {
        id?: string;
        email?: string;
        email_verified?: boolean | "true" | "false";
      };
    };
    if (profile.resultcode !== "00") {
      throw new MobileAuthError(401, "AUTH_PROFILE_FAILED", "provider 프로필 조회에 실패했습니다.");
    }
    const rawVerified = profile.response?.email_verified;
    const emailVerified = rawVerified === true || rawVerified === "true";

    return {
      providerUserId: (profile.response?.id ?? "").trim(),
      email: (profile.response?.email ?? "").trim().toLowerCase() || null,
      emailVerified
    };
  }

  const profileRes = await fetchWithTimeout("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${input.accessToken}` }
  });
  if (!profileRes.ok) {
    throw new MobileAuthError(401, "AUTH_PROFILE_FAILED", "provider 프로필 조회에 실패했습니다.");
  }
  const profile = (await profileRes.json()) as {
    id?: number | string;
    kakao_account?: {
      email?: string;
      is_email_valid?: boolean;
      is_email_verified?: boolean;
    };
  };
  const emailRaw = (profile.kakao_account?.email ?? "").trim().toLowerCase();
  const email =
    emailRaw &&
    profile.kakao_account?.is_email_valid === true &&
    profile.kakao_account?.is_email_verified === true
      ? emailRaw
      : null;

  return {
    providerUserId: String(profile.id ?? "").trim(),
    email,
    emailVerified: email !== null
  };
}
