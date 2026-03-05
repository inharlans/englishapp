import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireUserFromRequest = vi.fn();
const mockFindMany = vi.fn();
const mockUpdateMany = vi.fn();
const mockVerifyMobileAccessToken = vi.fn();
const mockCaptureAppError = vi.fn();

vi.mock("@/lib/api/route-helpers", () => ({
  requireUserFromRequest: mockRequireUserFromRequest
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mobileRefreshToken: {
      findMany: mockFindMany,
      updateMany: mockUpdateMany
    }
  }
}));

vi.mock("@/lib/mobileTokens", () => ({
  verifyMobileAccessToken: mockVerifyMobileAccessToken
}));

vi.mock("@/lib/observability", () => ({
  captureAppError: mockCaptureAppError
}));

function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized." }), {
    status: 401,
    headers: { "content-type": "application/json" }
  });
}

describe("GET /api/auth/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: false, response: unauthorizedResponse() });
    const { GET } = await import("./route");

    const res = await GET(new Request("http://localhost/api/auth/sessions") as never);
    expect(res.status).toBe(401);
  });

  it("returns active refresh-token sessions", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 2 } });
    mockVerifyMobileAccessToken.mockResolvedValue({ userId: 2, email: "u@test.com", deviceId: "device-b" });
    mockFindMany.mockResolvedValue([
      { id: 10, deviceId: "device-a", createdAt: new Date("2026-01-01T00:00:00.000Z") },
      { id: 11, deviceId: "device-a", createdAt: new Date("2026-01-02T00:00:00.000Z") },
      { id: 12, deviceId: "device-b", createdAt: new Date("2026-01-03T00:00:00.000Z") }
    ]);

    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/auth/sessions", {
        headers: {
          authorization: "Bearer token",
          "x-auth-mode": "bearer"
        }
      }) as never
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sessions).toHaveLength(3);
    expect(body.sessions[0]).toMatchObject({
      id: "10",
      deviceLabel: "dev***-a",
      isCurrent: false
    });
    expect(body.sessions[1]).toMatchObject({
      id: "11",
      deviceLabel: "dev***-a",
      isCurrent: false
    });
    expect(body.sessions[2]).toMatchObject({
      id: "12",
      deviceLabel: "dev***-b",
      isCurrent: true
    });
  });

  it("returns 500 when database query fails", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 2 } });
    mockFindMany.mockRejectedValue(new Error("db down"));
    const { GET } = await import("./route");

    const res = await GET(new Request("http://localhost/api/auth/sessions") as never);
    expect(res.status).toBe(500);
    expect(mockCaptureAppError).toHaveBeenCalledTimes(1);
  });

  it("marks none as current when bearer claims have no device id", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 2 } });
    mockVerifyMobileAccessToken.mockResolvedValue({ userId: 2, email: "u@test.com", deviceId: null });
    mockFindMany.mockResolvedValue([
      { id: 20, deviceId: "device-a", createdAt: new Date("2026-01-01T00:00:00.000Z") }
    ]);

    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/auth/sessions", {
        headers: {
          authorization: "Bearer legacy-token",
          "x-auth-mode": "bearer",
          "x-device-id": "device-a"
        }
      }) as never
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sessions[0]).toMatchObject({
      id: "20",
      isCurrent: false
    });
  });

  it("marks none as current when same device appears multiple times", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 2 } });
    mockVerifyMobileAccessToken.mockResolvedValue({ userId: 2, email: "u@test.com", deviceId: "device-a" });
    mockFindMany.mockResolvedValue([
      { id: 31, deviceId: "device-a", createdAt: new Date("2026-01-03T00:00:00.000Z") },
      { id: 30, deviceId: "device-a", createdAt: new Date("2026-01-02T00:00:00.000Z") },
      { id: 29, deviceId: "device-b", createdAt: new Date("2026-01-01T00:00:00.000Z") }
    ]);

    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/auth/sessions", {
        headers: {
          authorization: "Bearer token",
          "x-auth-mode": "bearer"
        }
      }) as never
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sessions.map((s: { isCurrent: boolean }) => s.isCurrent)).toEqual([false, false, false]);
  });

  it("does not trust x-device-id without bearer auth mode", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 2 } });
    mockFindMany.mockResolvedValue([
      { id: 30, deviceId: "device-a", createdAt: new Date("2026-01-01T00:00:00.000Z") }
    ]);

    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/auth/sessions", {
        headers: {
          "x-device-id": "device-a"
        }
      }) as never
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sessions[0]).toMatchObject({
      id: "30",
      isCurrent: false
    });
  });
});
