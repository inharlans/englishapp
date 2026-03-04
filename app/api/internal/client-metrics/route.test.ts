import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockVerifySessionToken = vi.fn();
const mockVerifyMobileAccessToken = vi.fn();
const mockLogJson = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetClientIpFromHeaders = vi.fn();

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

vi.mock("@/lib/authJwt", () => ({
  getSessionCookieName: () => "auth_session",
  verifySessionToken: mockVerifySessionToken
}));

vi.mock("@/lib/mobileTokens", () => ({
  verifyMobileAccessToken: mockVerifyMobileAccessToken
}));

vi.mock("@/lib/logger", () => ({
  logJson: mockLogJson
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mockCheckRateLimit,
  getClientIpFromHeaders: mockGetClientIpFromHeaders
}));

function makeRequest(headers?: HeadersInit, body?: unknown): NextRequest {
  return new NextRequest("https://www.oingapp.com/api/internal/client-metrics", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

describe("POST /api/internal/client-metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://www.oingapp.com";
    mockGetClientIpFromHeaders.mockReturnValue("127.0.0.1");
    mockCheckRateLimit.mockResolvedValue({ ok: true });
    mockVerifySessionToken.mockResolvedValue({ uid: 101, email: "user@test.com" });
    mockVerifyMobileAccessToken.mockResolvedValue({ userId: 101, email: "user@test.com" });
  });

  afterEach(() => {
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
      return;
    }
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  it("returns 401 when unauthenticated", async () => {
    mockVerifySessionToken.mockResolvedValue(null);
    const { POST } = await import("./route");

    const res = await POST(
      makeRequest({
        origin: "https://www.oingapp.com",
        cookie: "auth_session=session-token"
      }, {
        name: "metric.home_cta_click",
        ts: Date.now(),
        payload: { cta: "home", page: "main" }
      })
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "Unauthorized." });
  });

  it("accepts bearer-only request with x-auth-mode=bearer", async () => {
    mockVerifySessionToken.mockResolvedValue(null);
    const { POST } = await import("./route");

    const res = await POST(
      makeRequest({
        origin: "https://www.oingapp.com",
        authorization: "Bearer mobile-access-token",
        "x-auth-mode": "bearer"
      }, {
        name: "metric.home_cta_click",
        ts: Date.now(),
        payload: { cta: "hero", page: "home" }
      })
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(mockVerifyMobileAccessToken).toHaveBeenCalledOnce();
  });

  it("returns 401 when bearer verifier throws", async () => {
    mockVerifySessionToken.mockResolvedValue(null);
    mockVerifyMobileAccessToken.mockRejectedValue(new Error("invalid token"));
    const { POST } = await import("./route");

    const res = await POST(
      makeRequest({
        origin: "https://www.oingapp.com",
        authorization: "Bearer broken-mobile-token",
        "x-auth-mode": "bearer"
      }, {
        name: "metric.home_cta_click",
        ts: Date.now(),
        payload: { cta: "hero", page: "home" }
      })
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "Unauthorized." });
  });

  it("accepts session-only request and uses session user id for rate limit key", async () => {
    mockVerifyMobileAccessToken.mockResolvedValue(null);
    const { POST } = await import("./route");

    const res = await POST(
      makeRequest(
        {
          origin: "https://www.oingapp.com",
          cookie: "auth_session=session-token"
        },
        {
          name: "metric.home_cta_click",
          ts: Date.now(),
          payload: { cta: "session", page: "wordbooks" }
        }
      )
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(mockCheckRateLimit).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ key: "client-metrics:101:127.0.0.1" })
    );
    expect(mockVerifyMobileAccessToken).not.toHaveBeenCalled();
  });

  it("rejects mixed session+bearer request when x-auth-mode=bearer is missing", async () => {
    const { POST } = await import("./route");

    const res = await POST(
      makeRequest({
        origin: "https://www.oingapp.com",
        cookie: "auth_session=session-token",
        authorization: "Bearer mobile-access-token"
      }, {
        name: "metric.home_cta_click",
        ts: Date.now(),
        payload: { cta: "mixed", page: "home" }
      })
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "Unauthorized." });
  });

  it("accepts authenticated request and logs metric", async () => {
    mockVerifySessionToken.mockResolvedValue(null);
    const { POST } = await import("./route");

    const res = await POST(
      makeRequest({
        origin: "https://www.oingapp.com",
        authorization: "Bearer mobile-access-token",
        "x-auth-mode": "bearer"
      }, {
        name: "metric.home_cta_click",
        ts: Date.now(),
        payload: { cta: "hero", page: "home" }
      })
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(mockCheckRateLimit).toHaveBeenCalledTimes(2);
    expect(mockCheckRateLimit).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ key: "client-metrics:101:127.0.0.1" })
    );
    expect(mockLogJson).toHaveBeenCalledWith(
      "info",
      "client_metric",
      expect.objectContaining({ name: "metric.home_cta_click" })
    );
  });

  it("keeps same-host guard and rejects invalid origin", async () => {
    const { POST } = await import("./route");

    const res = await POST(
      makeRequest({
        origin: "https://evil.example.com",
        cookie: "auth_session=session-token"
      }, {
        name: "metric.home_cta_click",
        ts: Date.now(),
        payload: { cta: "hero", page: "home" }
      })
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "Invalid origin." });
  });
});
