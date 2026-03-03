import { MobileAuthError } from "@/lib/mobileAuthErrors";

function getAllowedRedirectUris(): string[] {
  const raw = process.env.MOBILE_OAUTH_ALLOWED_REDIRECT_URIS ?? "";
  const parsed = raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

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

  return ["englishappmobile://auth/callback"];
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
