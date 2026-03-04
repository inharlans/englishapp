import { MobileAuthError } from "@/lib/mobileAuthErrors";
import type { OAuthProvider } from "@/lib/mobileAuthSchemas";

const DEFAULT_MOBILE_REDIRECT_URI = "englishappmobile://auth/callback";
const PROVIDER_CALLBACK_PATH: Record<OAuthProvider, string> = {
  google: "/api/auth/mobile/google/callback",
  naver: "/api/auth/mobile/naver/callback",
  kakao: "/api/auth/mobile/kakao/callback"
};
const PROVIDER_REDIRECT_ENV_KEY: Record<OAuthProvider, string> = {
  google: "MOBILE_GOOGLE_OAUTH_REDIRECT_URI",
  naver: "MOBILE_NAVER_OAUTH_REDIRECT_URI",
  kakao: "MOBILE_KAKAO_OAUTH_REDIRECT_URI"
};

function parseAllowedRedirectUris(raw: string): string[] {
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function getAllowedRedirectUris(): string[] {
  const raw = process.env.MOBILE_OAUTH_ALLOWED_REDIRECT_URIS ?? "";
  const parsed = parseAllowedRedirectUris(raw);

  if (parsed.length > 0) {
    return parsed;
  }

  if (process.env.NODE_ENV === "production") {
    throw new MobileAuthError(
      500,
      "AUTH_MOBILE_START_FAILED",
      "MOBILE_OAUTH_ALLOWED_REDIRECT_URIS 설정이 필요합니다."
    );
  }

  return [DEFAULT_MOBILE_REDIRECT_URI];
}

export function getFallbackMobileRedirectUri(): string {
  const raw = process.env.MOBILE_OAUTH_ALLOWED_REDIRECT_URIS ?? "";
  const parsed = parseAllowedRedirectUris(raw);
  const candidate = parsed[0] ?? DEFAULT_MOBILE_REDIRECT_URI;

  try {
    return new URL(candidate).toString();
  } catch {
    return DEFAULT_MOBILE_REDIRECT_URI;
  }
}

export function assertValidMobileRedirectUri(redirectUri: string): void {
  const trimmed = redirectUri.trim();
  if (!trimmed) {
    throw new MobileAuthError(400, "AUTH_INVALID_REDIRECT_URI", "redirectUri가 비어 있습니다.");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new MobileAuthError(400, "AUTH_INVALID_REDIRECT_URI", "redirectUri 형식이 올바르지 않습니다.");
  }

  const allowed = getAllowedRedirectUris();
  if (!allowed.includes(parsed.toString())) {
    throw new MobileAuthError(400, "AUTH_INVALID_REDIRECT_URI", "허용되지 않은 redirectUri 입니다.");
  }
}

function normalizeOrigin(origin: string): string {
  return origin.endsWith("/") ? origin.slice(0, -1) : origin;
}

function normalizePath(pathname: string): string {
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function buildProviderCallbackFromBase(rawBase: string, provider: OAuthProvider): string {
  let parsed: URL;
  try {
    parsed = new URL(rawBase);
  } catch {
    throw new MobileAuthError(
      500,
      "AUTH_MOBILE_START_FAILED",
        "NEXT_PUBLIC_APP_URL 형식이 올바르지 않습니다."
    );
  }

  return `${normalizeOrigin(parsed.origin)}${PROVIDER_CALLBACK_PATH[provider]}`;
}

function normalizeProviderCallbackUri(raw: string, provider: OAuthProvider): string {
  const envKey = PROVIDER_REDIRECT_ENV_KEY[provider];
  const expectedPath = PROVIDER_CALLBACK_PATH[provider];

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new MobileAuthError(
        500,
        "AUTH_MOBILE_START_FAILED",
        `${envKey} 형식이 올바르지 않습니다.`
    );
  }

  if (normalizePath(parsed.pathname) !== expectedPath) {
    throw new MobileAuthError(
      500,
      "AUTH_MOBILE_START_FAILED",
      `${envKey} 경로는 ${expectedPath} 이어야 합니다.`
    );
  }

  const isHttps = parsed.protocol === "https:";
  const isLocalHttp = parsed.protocol === "http:" && isLoopbackHost(parsed.hostname);
  if (!isHttps && !isLocalHttp) {
    throw new MobileAuthError(
        500,
        "AUTH_MOBILE_START_FAILED",
        `${envKey} 는 https 또는 localhost http URL 이어야 합니다.`
    );
  }

  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    throw new MobileAuthError(
        500,
        "AUTH_MOBILE_START_FAILED",
        `${envKey} 는 https URL 이어야 합니다.`
    );
  }

  return parsed.toString();
}

export function resolveProviderRedirectUri(input: {
  provider: OAuthProvider;
  requestOrigin?: string;
}): string {
  const envKey = PROVIDER_REDIRECT_ENV_KEY[input.provider];
  const configured = process.env[envKey]?.trim();
  if (configured) {
    return normalizeProviderCallbackUri(configured, input.provider);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    return normalizeProviderCallbackUri(
      buildProviderCallbackFromBase(appUrl, input.provider),
      input.provider
    );
  }

  const fromRequest = input.requestOrigin?.trim();
  if (fromRequest) {
    try {
      const parsed = new URL(fromRequest);
      if (isLoopbackHost(parsed.hostname)) {
        return normalizeProviderCallbackUri(
          `${normalizeOrigin(parsed.origin)}${PROVIDER_CALLBACK_PATH[input.provider]}`,
          input.provider
        );
      }
    } catch {
      // Ignore malformed request origin and use default local callback.
    }
  }

  if (process.env.NODE_ENV === "production") {
    throw new MobileAuthError(
      500,
      "AUTH_MOBILE_START_FAILED",
      `${envKey} 또는 NEXT_PUBLIC_APP_URL 설정이 필요합니다.`
    );
  }

  return `http://localhost:3000${PROVIDER_CALLBACK_PATH[input.provider]}`;
}
