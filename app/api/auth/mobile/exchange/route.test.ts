import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockVerifyMobileState = vi.fn();
const mockRecordApiMetricFromStart = vi.fn();
const mockCaptureAppError = vi.fn();
const mockExchangeCodeForProviderToken = vi.fn();
const mockFetchProviderProfile = vi.fn();

vi.mock("@/lib/mobileState", () => ({
  verifyMobileState: mockVerifyMobileState
}));

vi.mock("@/lib/mobileOauthProviders", () => ({
  exchangeCodeForProviderToken: mockExchangeCodeForProviderToken,
  fetchProviderProfile: mockFetchProviderProfile
}));

vi.mock("@/lib/mobileTokens", () => ({
  issueMobileAccessToken: vi.fn(),
  mintRefreshTokenPair: vi.fn()
}));

vi.mock("@/lib/oauthAccounts", () => ({
  resolveOrLinkOAuthUser: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn()
  }
}));

vi.mock("@/lib/observability", () => ({
  recordApiMetricFromStart: mockRecordApiMetricFromStart,
  captureAppError: mockCaptureAppError
}));

describe("POST /api/auth/mobile/exchange", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockVerifyMobileState.mockResolvedValue({
      provider: "google",
      deviceId: "device-12345",
      redirectUri: "englishappmobile://auth/callback",
      providerRedirectUri: "englishappmobile://auth/callback",
      codeChallenge: "not-a-real-challenge",
      nonce: "nonce"
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects request when PKCE verifier does not match state challenge", async () => {
    const { POST } = await import("./route");

    const res = await POST(
      new NextRequest("http://localhost/api/auth/mobile/exchange", {
        method: "POST",
        body: JSON.stringify({
          provider: "google",
          code: "auth-code",
          state: "signed-state",
          deviceId: "device-12345",
          codeVerifier: "a".repeat(43)
        })
      })
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      errorCode: "AUTH_INVALID_STATE"
    });
  });

  it("uses server callback redirect URI for legacy google state", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.oingapp.com");
    mockVerifyMobileState.mockResolvedValue({
      provider: "google",
      deviceId: "device-12345",
      redirectUri: "englishappmobile://auth/callback",
      providerRedirectUri: "englishappmobile://auth/callback",
      codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
      nonce: "nonce"
    });
    mockExchangeCodeForProviderToken.mockRejectedValue(new Error("exchange failed"));

    const { POST } = await import("./route");

    await POST(
      new NextRequest("http://localhost/api/auth/mobile/exchange", {
        method: "POST",
        body: JSON.stringify({
          provider: "google",
          code: "auth-code",
          state: "signed-state",
          deviceId: "device-12345",
          codeVerifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
        })
      })
    );

    expect(mockExchangeCodeForProviderToken).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectUri: "https://www.oingapp.com/api/auth/mobile/google/callback"
      })
    );
  });
});
