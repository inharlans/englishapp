import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockVerifyMobileState = vi.fn();

vi.mock("@/lib/mobileState", () => ({
  verifyMobileState: mockVerifyMobileState
}));

describe("GET /api/auth/mobile/google/callback", () => {
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
      provider: "google",
      deviceId: "device-12345",
      redirectUri: "englishappmobile://auth/callback",
      providerRedirectUri: "https://www.oingapp.com/api/auth/mobile/google/callback",
      codeChallenge: "a".repeat(43),
      nonce: "nonce"
    });

    const { GET } = await import("./route");
    const req = new NextRequest(
      "http://localhost/api/auth/mobile/google/callback?code=auth-code&state=signed-state"
    );

    const res = await GET(req);

    expect(res.status).toBe(302);
    const location = res.headers.get("location");
    expect(location).toContain("englishappmobile://auth/callback");
    expect(location).toContain("code=auth-code");
    expect(location).toContain("state=signed-state");
  });

  it("redirects with invalid_state when state is missing or invalid", async () => {
    mockVerifyMobileState.mockResolvedValue(null);

    const { GET } = await import("./route");
    const req = new NextRequest("http://localhost/api/auth/mobile/google/callback?code=auth-code");

    const res = await GET(req);

    expect(res.status).toBe(302);
    const location = res.headers.get("location");
    expect(location).toContain("englishappmobile://auth/callback");
    expect(location).toContain("error=invalid_state");
    expect(location).not.toContain("code=auth-code");
  });

  it("redirects with invalid_state when state provider is not google", async () => {
    mockVerifyMobileState.mockResolvedValue({
      provider: "kakao",
      deviceId: "device-12345",
      redirectUri: "englishappmobile://auth/callback",
      providerRedirectUri: "https://www.oingapp.com/api/auth/mobile/google/callback",
      codeChallenge: "a".repeat(43),
      nonce: "nonce"
    });

    const { GET } = await import("./route");
    const req = new NextRequest("http://localhost/api/auth/mobile/google/callback?code=auth-code&state=signed-state");

    const res = await GET(req);

    expect(res.status).toBe(302);
    const location = res.headers.get("location");
    expect(location).toContain("error=invalid_state");
    expect(location).not.toContain("code=auth-code");
  });

  it("redirects with invalid_request when neither code nor error is provided", async () => {
    mockVerifyMobileState.mockResolvedValue({
      provider: "google",
      deviceId: "device-12345",
      redirectUri: "englishappmobile://auth/callback",
      providerRedirectUri: "https://www.oingapp.com/api/auth/mobile/google/callback",
      codeChallenge: "a".repeat(43),
      nonce: "nonce"
    });

    const { GET } = await import("./route");
    const req = new NextRequest("http://localhost/api/auth/mobile/google/callback?state=signed-state");

    const res = await GET(req);

    expect(res.status).toBe(302);
    const location = res.headers.get("location");
    expect(location).toContain("error=invalid_request");
    expect(location).toContain("state=signed-state");
    expect(location).not.toContain("code=");
  });
});
