import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockVerifyMobileState = vi.fn();

vi.mock("@/lib/mobileState", () => ({
  verifyMobileState: mockVerifyMobileState
}));

describe("GET /api/auth/mobile/naver/callback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("MOBILE_OAUTH_ALLOWED_REDIRECT_URIS", "englishappmobile://auth/callback");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects to app callback with code/state when state is valid", async () => {
    mockVerifyMobileState.mockResolvedValue({
      provider: "naver",
      deviceId: "device-12345",
      redirectUri: "englishappmobile://auth/callback",
      providerRedirectUri: "https://www.oingapp.com/api/auth/mobile/naver/callback",
      codeChallenge: "a".repeat(43),
      nonce: "nonce"
    });

    const { GET } = await import("./route");
    const req = new NextRequest(
      "http://localhost/api/auth/mobile/naver/callback?code=auth-code&state=signed-state"
    );

    const res = await GET(req);

    expect(res.status).toBe(302);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const location = res.headers.get("location");
    expect(location).toContain("englishappmobile://auth/callback");
    expect(location).toContain("code=auth-code");
    expect(location).toContain("state=signed-state");
  });
});
