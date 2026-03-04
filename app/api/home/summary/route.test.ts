import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireUserFromRequest = vi.fn();
const mockCaptureAppError = vi.fn();
const mockGetSummary = vi.fn();

vi.mock("@/lib/api/route-helpers", () => ({
  requireUserFromRequest: mockRequireUserFromRequest
}));

vi.mock("@/lib/observability", () => ({
  captureAppError: mockCaptureAppError
}));

vi.mock("@/server/domain/mobile-home/service", () => ({
  MobileHomeService: class {
    getSummary = mockGetSummary;
  }
}));

function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized." }), {
    status: 401,
    headers: { "content-type": "application/json" }
  });
}

describe("GET /api/home/summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: false, response: unauthorizedResponse() });
    const { GET } = await import("./route");

    const res = await GET({} as never);
    expect(res.status).toBe(401);
  });

  it("returns summary payload when authenticated", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 7 } });
    mockGetSummary.mockResolvedValue({
      todayCount: 0,
      weeklyCount: 0,
      totalWords: 11,
      totalWordbooks: 2,
      recentWords: [],
      isFallback: true
    });
    const { GET } = await import("./route");

    const res = await GET({} as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      todayCount: 0,
      weeklyCount: 0,
      totalWords: 11,
      totalWordbooks: 2,
      recentWords: [],
      isFallback: true
    });
  });
});
