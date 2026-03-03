import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetSessionCookieName = vi.fn(() => "session");
const mockVerifySessionToken = vi.fn();
const mockVerifyMobileAccessToken = vi.fn();
const mockFindUnique = vi.fn();
const mockCaptureAppError = vi.fn();

vi.mock("@/lib/authJwt", () => ({
  getSessionCookieName: mockGetSessionCookieName,
  verifySessionToken: mockVerifySessionToken
}));

vi.mock("@/lib/mobileTokens", () => ({
  verifyMobileAccessToken: mockVerifyMobileAccessToken
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique
    }
  }
}));

vi.mock("@/lib/observability", () => ({
  captureAppError: mockCaptureAppError
}));

function makeRequest(input: {
  authHeader?: string;
  cookieHeader?: string;
  authMode?: "session" | "bearer";
}): NextRequest {
  const headers = new Headers();
  if (input.authHeader) {
    headers.set("authorization", input.authHeader);
  }
  if (input.cookieHeader) {
    headers.set("cookie", input.cookieHeader);
  }
  if (input.authMode) {
    headers.set("x-auth-mode", input.authMode);
  }
  return new NextRequest("http://localhost/api/test", { headers });
}

function userById(id: number) {
  if (id === 1) {
    return {
      id: 1,
      email: "session@test.com",
      isAdmin: false,
      plan: "FREE",
      proUntil: null,
      dailyGoal: 10
    };
  }
  if (id === 2) {
    return {
      id: 2,
      email: "bearer@test.com",
      isAdmin: false,
      plan: "PRO",
      proUntil: null,
      dailyGoal: 20
    };
  }
  return null;
}

describe("getUserFromRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockImplementation(async ({ where }: { where: { id: number } }) => userById(where.id));
  });

  it("uses session when x-auth-mode=session with dual credentials", async () => {
    mockVerifySessionToken.mockResolvedValue({ sub: "1" });
    mockVerifyMobileAccessToken.mockResolvedValue({ userId: 2, email: "bearer@test.com" });

    const { getUserFromRequest } = await import("@/lib/authServer");
    const req = makeRequest({
      authHeader: "Bearer mobile-token",
      cookieHeader: "session=session-token",
      authMode: "session"
    });
    const user = await getUserFromRequest(req);

    expect(user?.id).toBe(1);
    expect(mockVerifyMobileAccessToken).not.toHaveBeenCalled();
  });

  it("returns null when x-auth-mode=bearer and dual credentials target different users", async () => {
    mockVerifySessionToken.mockResolvedValue({ sub: "1" });
    mockVerifyMobileAccessToken.mockResolvedValue({
      userId: 2,
      email: "bearer@test.com"
    });

    const { getUserFromRequest } = await import("@/lib/authServer");
    const req = makeRequest({
      authHeader: "Bearer mobile-token",
      cookieHeader: "session=session-token",
      authMode: "bearer"
    });
    const user = await getUserFromRequest(req);

    expect(user).toBeNull();
  });

  it("uses bearer when x-auth-mode=bearer and both credentials resolve to same user", async () => {
    mockVerifySessionToken.mockResolvedValue({ sub: "1" });
    mockVerifyMobileAccessToken.mockResolvedValue({
      userId: 1,
      email: "session@test.com"
    });

    const { getUserFromRequest } = await import("@/lib/authServer");
    const req = makeRequest({
      authHeader: "Bearer mobile-token",
      cookieHeader: "session=session-token",
      authMode: "bearer"
    });
    const user = await getUserFromRequest(req);

    expect(user?.id).toBe(1);
  });

  it("returns null when x-auth-mode=bearer and bearer is invalid", async () => {
    mockVerifySessionToken.mockResolvedValue({ sub: "1" });
    mockVerifyMobileAccessToken.mockResolvedValue(null);

    const { getUserFromRequest } = await import("@/lib/authServer");
    const req = makeRequest({
      authHeader: "Bearer invalid-token",
      cookieHeader: "session=session-token",
      authMode: "bearer"
    });
    const user = await getUserFromRequest(req);

    expect(user).toBeNull();
  });

  it("returns null when x-auth-mode=bearer and bearer verification throws", async () => {
    mockVerifySessionToken.mockResolvedValue({ sub: "1" });
    const authError = new Error("invalid token");
    (authError as Error & { code?: string }).code = "ERR_JWT_EXPIRED";
    mockVerifyMobileAccessToken.mockRejectedValue(authError);

    const { getUserFromRequest } = await import("@/lib/authServer");
    const req = makeRequest({
      authHeader: "Bearer broken-token",
      cookieHeader: "session=session-token",
      authMode: "bearer"
    });
    const user = await getUserFromRequest(req);

    expect(user).toBeNull();
    expect(mockCaptureAppError).not.toHaveBeenCalled();
  });

  it("defaults to session when auth mode is missing and dual credentials exist", async () => {
    mockVerifySessionToken.mockResolvedValue({ sub: "1" });
    mockVerifyMobileAccessToken.mockResolvedValue({ userId: 2, email: "bearer@test.com" });

    const { getUserFromRequest } = await import("@/lib/authServer");
    const req = makeRequest({ authHeader: "Bearer mobile-token", cookieHeader: "session=session-token" });
    const user = await getUserFromRequest(req);

    expect(user?.id).toBe(1);
    expect(mockVerifyMobileAccessToken).not.toHaveBeenCalled();
  });

  it("uses bearer when session is missing and bearer is valid", async () => {
    mockVerifySessionToken.mockResolvedValue(null);
    mockVerifyMobileAccessToken.mockResolvedValue({ userId: 2, email: "bearer@test.com" });

    const { getUserFromRequest } = await import("@/lib/authServer");
    const req = makeRequest({ authHeader: "Bearer mobile-token" });
    const user = await getUserFromRequest(req);

    expect(user?.id).toBe(2);
  });

  it("returns null when only bearer is present and verifier throws", async () => {
    mockVerifySessionToken.mockResolvedValue(null);
    const authError = new Error("verify failed");
    (authError as Error & { code?: string }).code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
    mockVerifyMobileAccessToken.mockRejectedValue(authError);

    const { getUserFromRequest } = await import("@/lib/authServer");
    const req = makeRequest({ authHeader: "Bearer broken-token" });
    const user = await getUserFromRequest(req);

    expect(user).toBeNull();
    expect(mockCaptureAppError).not.toHaveBeenCalled();
  });

  it("throws unknown verifier failures to surface internal errors", async () => {
    mockVerifySessionToken.mockResolvedValue(null);
    mockVerifyMobileAccessToken.mockRejectedValue(new Error("internal verifier outage"));

    const { getUserFromRequest } = await import("@/lib/authServer");
    const req = makeRequest({ authHeader: "Bearer broken-token" });

    await expect(getUserFromRequest(req)).rejects.toThrow("internal verifier outage");
    expect(mockCaptureAppError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "mobile_bearer_verify_failed",
        level: "warn"
      })
    );
  });
});
