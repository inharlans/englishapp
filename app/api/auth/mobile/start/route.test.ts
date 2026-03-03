import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockIssueMobileState = vi.fn();
const mockBuildAuthorizationUrl = vi.fn();
const mockRecordApiMetricFromStart = vi.fn();
const mockCaptureAppError = vi.fn();

vi.mock("@/lib/mobileState", () => ({
  issueMobileState: mockIssueMobileState
}));

vi.mock("@/lib/mobileOauthProviders", () => ({
  buildAuthorizationUrl: mockBuildAuthorizationUrl
}));

vi.mock("@/lib/observability", () => ({
  recordApiMetricFromStart: mockRecordApiMetricFromStart,
  captureAppError: mockCaptureAppError
}));

describe("POST /api/auth/mobile/start", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockIssueMobileState.mockResolvedValue("signed-state");
    mockBuildAuthorizationUrl.mockReturnValue("https://provider.test/auth");
  });

  it("returns authorizationUrl and state for valid PKCE payload", async () => {
    const { POST } = await import("./route");

    const res = await POST(
      new NextRequest("http://localhost/api/auth/mobile/start", {
        method: "POST",
        body: JSON.stringify({
          provider: "google",
          redirectUri: "englishappmobile://auth/callback",
          deviceId: "device-12345",
          codeChallenge: "a".repeat(43),
          codeChallengeMethod: "S256"
        })
      })
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      authorizationUrl: "https://provider.test/auth",
      state: "signed-state"
    });
    expect(mockIssueMobileState).toHaveBeenCalledWith(
      expect.objectContaining({
        codeChallenge: "a".repeat(43)
      })
    );
  });
});
