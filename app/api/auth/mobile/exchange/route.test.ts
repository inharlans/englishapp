import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockVerifyMobileState = vi.fn();
const mockRecordApiMetricFromStart = vi.fn();
const mockCaptureAppError = vi.fn();

vi.mock("@/lib/mobileState", () => ({
  verifyMobileState: mockVerifyMobileState
}));

vi.mock("@/lib/mobileOauthProviders", () => ({
  exchangeCodeForProviderToken: vi.fn(),
  fetchProviderProfile: vi.fn()
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
      codeChallenge: "not-a-real-challenge",
      nonce: "nonce"
    });
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
});
