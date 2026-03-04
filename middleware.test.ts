import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const originalMobileAccessSecret = process.env.MOBILE_ACCESS_SECRET;

const { mockJwtVerify, mockVerifySessionToken } = vi.hoisted(() => ({
  mockJwtVerify: vi.fn(),
  mockVerifySessionToken: vi.fn()
}));

vi.mock("jose", () => ({
  jwtVerify: mockJwtVerify
}));

vi.mock("@/lib/authJwt", () => ({
  getSessionCookieName: () => "auth_session",
  verifySessionToken: mockVerifySessionToken
}));

function makeRequest(pathname: string, headers?: HeadersInit): NextRequest {
  return new NextRequest(`https://www.oingapp.com${pathname}`, {
    headers: new Headers(headers)
  });
}

describe("middleware auth entry", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockVerifySessionToken.mockResolvedValue(null);
    process.env.MOBILE_ACCESS_SECRET = "test-mobile-secret";
  });

  afterEach(() => {
    if (originalMobileAccessSecret === undefined) {
      delete process.env.MOBILE_ACCESS_SECRET;
      return;
    }
    process.env.MOBILE_ACCESS_SECRET = originalMobileAccessSecret;
  });

  it("returns 401 for protected API without credentials", async () => {
    const { middleware } = await import("@/middleware");

    const res = await middleware(makeRequest("/api/wordbooks"));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized." });
  });

  it("allows protected API with valid session cookie", async () => {
    mockVerifySessionToken.mockResolvedValue({ sub: "1", email: "session@test.com" });
    const { middleware } = await import("@/middleware");

    const res = await middleware(
      makeRequest("/api/wordbooks", {
        cookie: "auth_session=session-token"
      })
    );

    expect(res.status).toBe(200);
  });

  it("allows protected API with valid bearer and x-auth-mode=bearer", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: "7",
        email: "mobile@test.com",
        tokenType: "mobile_access"
      }
    });
    const { middleware } = await import("@/middleware");

    const res = await middleware(
      makeRequest("/api/wordbooks", {
        authorization: "Bearer valid-mobile-token",
        "x-auth-mode": "bearer"
      })
    );

    expect(res.status).toBe(200);
  });

  it("rejects bearer when x-auth-mode header is missing", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: "7",
        email: "mobile@test.com",
        tokenType: "mobile_access"
      }
    });
    const { middleware } = await import("@/middleware");

    const res = await middleware(
      makeRequest("/api/wordbooks", {
        authorization: "Bearer valid-mobile-token"
      })
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized." });
    expect(mockJwtVerify).not.toHaveBeenCalled();
  });

  it("rejects bearer when token verification fails", async () => {
    mockJwtVerify.mockRejectedValue(new Error("invalid token"));
    const { middleware } = await import("@/middleware");

    const res = await middleware(
      makeRequest("/api/wordbooks", {
        authorization: "Bearer invalid-mobile-token",
        "x-auth-mode": "bearer"
      })
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized." });
    expect(mockJwtVerify).toHaveBeenCalledOnce();
  });

  it("keeps /api/auth as public path", async () => {
    const { middleware } = await import("@/middleware");

    const res = await middleware(makeRequest("/api/auth/mobile/start"));
    expect(res.status).toBe(200);
  });

  it("keeps payment webhook and internal cron as public paths", async () => {
    const { middleware } = await import("@/middleware");

    const webhookRes = await middleware(makeRequest("/api/payments/webhook"));
    const cronRes = await middleware(makeRequest("/api/internal/cron/plan-expire"));

    expect(webhookRes.status).toBe(200);
    expect(cronRes.status).toBe(200);
  });
});
