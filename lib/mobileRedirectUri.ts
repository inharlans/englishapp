import { MobileAuthError } from "@/lib/mobileAuthErrors";
import type { OAuthProvider } from "@/lib/mobileAuthSchemas";

const GOOGLE_MOBILE_CALLBACK_PATH = "/api/auth/mobile/google/callback";
const DEFAULT_MOBILE_REDIRECT_URI = "englishappmobile://auth/callback";

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

function buildGoogleCallbackFromBase(rawBase: string): string {
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

  return `${normalizeOrigin(parsed.origin)}${GOOGLE_MOBILE_CALLBACK_PATH}`;
}

function normalizeGoogleCallbackUri(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new MobileAuthError(
      500,
      "AUTH_MOBILE_START_FAILED",
      "MOBILE_GOOGLE_OAUTH_REDIRECT_URI 형식이 올바르지 않습니다."
    );
  }

  if (normalizePath(parsed.pathname) !== GOOGLE_MOBILE_CALLBACK_PATH) {
    throw new MobileAuthError(
      500,
      "AUTH_MOBILE_START_FAILED",
      `MOBILE_GOOGLE_OAUTH_REDIRECT_URI 경로는 ${GOOGLE_MOBILE_CALLBACK_PATH} 이어야 합니다.`
    );
  }

  const isHttps = parsed.protocol === "https:";
  const isLocalHttp = parsed.protocol === "http:" && isLoopbackHost(parsed.hostname);
  if (!isHttps && !isLocalHttp) {
    throw new MobileAuthError(
      500,
      "AUTH_MOBILE_START_FAILED",
      "MOBILE_GOOGLE_OAUTH_REDIRECT_URI 는 https 또는 localhost http URL 이어야 합니다."
    );
  }

  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    throw new MobileAuthError(
      500,
      "AUTH_MOBILE_START_FAILED",
      "MOBILE_GOOGLE_OAUTH_REDIRECT_URI 는 https URL 이어야 합니다."
    );
  }

  return parsed.toString();
}

export function resolveProviderRedirectUri(input: {
  provider: OAuthProvider;
  mobileRedirectUri: string;
  requestOrigin?: string;
}): string {
  if (input.provider !== "google") {
    return input.mobileRedirectUri;
  }

  const configured = process.env.MOBILE_GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (configured) {
    return normalizeGoogleCallbackUri(configured);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    return normalizeGoogleCallbackUri(buildGoogleCallbackFromBase(appUrl));
  }

  if (process.env.NODE_ENV === "production") {
    throw new MobileAuthError(
      500,
      "AUTH_MOBILE_START_FAILED",
      "MOBILE_GOOGLE_OAUTH_REDIRECT_URI 또는 NEXT_PUBLIC_APP_URL 설정이 필요합니다."
    );
  }

  const fromRequest = input.requestOrigin?.trim();
  if (fromRequest) {
    try {
      const parsed = new URL(fromRequest);
      if (isLoopbackHost(parsed.hostname)) {
        return normalizeGoogleCallbackUri(`${normalizeOrigin(parsed.origin)}${GOOGLE_MOBILE_CALLBACK_PATH}`);
      }
    } catch {
      // Ignore malformed request origin and use default local callback.
    }
  }

  return `http://localhost:3000${GOOGLE_MOBILE_CALLBACK_PATH}`;
}
