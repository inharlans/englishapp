import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveProviderRedirectUri } from "@/lib/mobileRedirectUri";

describe("resolveProviderRedirectUri", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers NEXT_PUBLIC_APP_URL over request origin for google", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.oingapp.com");
    vi.stubEnv("MOBILE_GOOGLE_OAUTH_REDIRECT_URI", "");

    const uri = resolveProviderRedirectUri({
      provider: "google",
      mobileRedirectUri: "englishappmobile://auth/callback",
      requestOrigin: "https://malicious-host.example"
    });

    expect(uri).toBe("https://www.oingapp.com/api/auth/mobile/google/callback");
  });

  it("uses explicit MOBILE_GOOGLE_OAUTH_REDIRECT_URI when provided", () => {
    vi.stubEnv(
      "MOBILE_GOOGLE_OAUTH_REDIRECT_URI",
      "https://auth.oingapp.com/api/auth/mobile/google/callback"
    );

    const uri = resolveProviderRedirectUri({
      provider: "google",
      mobileRedirectUri: "englishappmobile://auth/callback",
      requestOrigin: "https://www.oingapp.com"
    });

    expect(uri).toBe("https://auth.oingapp.com/api/auth/mobile/google/callback");
  });

  it("throws in production when only request origin is available", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MOBILE_GOOGLE_OAUTH_REDIRECT_URI", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    expect(() =>
      resolveProviderRedirectUri({
        provider: "google",
        mobileRedirectUri: "englishappmobile://auth/callback",
        requestOrigin: "https://www.oingapp.com"
      })
    ).toThrow("MOBILE_GOOGLE_OAUTH_REDIRECT_URI 또는 NEXT_PUBLIC_APP_URL 설정이 필요합니다.");
  });

  it("throws when configured callback URI is malformed", () => {
    vi.stubEnv("MOBILE_GOOGLE_OAUTH_REDIRECT_URI", "not-a-url");

    expect(() =>
      resolveProviderRedirectUri({
        provider: "google",
        mobileRedirectUri: "englishappmobile://auth/callback"
      })
    ).toThrow("MOBILE_GOOGLE_OAUTH_REDIRECT_URI 형식이 올바르지 않습니다.");
  });

  it("throws when configured callback URI path does not match expected callback", () => {
    vi.stubEnv("MOBILE_GOOGLE_OAUTH_REDIRECT_URI", "https://auth.oingapp.com/oauth/google/callback");

    expect(() =>
      resolveProviderRedirectUri({
        provider: "google",
        mobileRedirectUri: "englishappmobile://auth/callback"
      })
    ).toThrow("MOBILE_GOOGLE_OAUTH_REDIRECT_URI 경로는 /api/auth/mobile/google/callback 이어야 합니다.");
  });

  it("throws when configured callback URI is non-local http", () => {
    vi.stubEnv("MOBILE_GOOGLE_OAUTH_REDIRECT_URI", "http://staging.oingapp.com/api/auth/mobile/google/callback");

    expect(() =>
      resolveProviderRedirectUri({
        provider: "google",
        mobileRedirectUri: "englishappmobile://auth/callback"
      })
    ).toThrow("MOBILE_GOOGLE_OAUTH_REDIRECT_URI 는 https 또는 localhost http URL 이어야 합니다.");
  });

  it("builds callback from NEXT_PUBLIC_APP_URL origin when path exists", () => {
    vi.stubEnv("MOBILE_GOOGLE_OAUTH_REDIRECT_URI", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.oingapp.com/app");

    const uri = resolveProviderRedirectUri({
      provider: "google",
      mobileRedirectUri: "englishappmobile://auth/callback"
    });

    expect(uri).toBe("https://www.oingapp.com/api/auth/mobile/google/callback");
  });

  it("ignores non-local request origin fallback in non-production", () => {
    vi.stubEnv("MOBILE_GOOGLE_OAUTH_REDIRECT_URI", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    const uri = resolveProviderRedirectUri({
      provider: "google",
      mobileRedirectUri: "englishappmobile://auth/callback",
      requestOrigin: "https://attacker.example"
    });

    expect(uri).toBe("http://localhost:3000/api/auth/mobile/google/callback");
  });
});
