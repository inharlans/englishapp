import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockVerifyMobileState = vi.fn();

vi.mock("@/lib/mobileState", () => ({
  verifyMobileState: mockVerifyMobileState
}));

describe("GET /api/auth/mobile/kakao/callback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("MOBILE_OAUTH_ALLOWED_REDIRECT_URIS", "englishappmobile://auth/callback");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects to app callback with provider error when provider returns error", async () => {
    mockVerifyMobileState.mockResolvedValue({
      provider: "kakao",
      deviceId: "device-12345",
      redirectUri: "englishappmobile://auth/callback",
      providerRedirectUri: "https://www.oingapp.com/api/auth/mobile/kakao/callback",
      codeChallenge: "a".repeat(43),
      nonce: "nonce"
    });

    const { GET } = await import("./route");
    const req = new NextRequest(
      "http://localhost/api/auth/mobile/kakao/callback?state=signed-state&error=access_denied"
    );

    const res = await GET(req);

    expect(res.status).toBe(302);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const location = res.headers.get("location");
    expect(location).toContain("englishappmobile://auth/callback");
    expect(location).toContain("state=signed-state");
    expect(location).toContain("error=access_denied");
  });
});
