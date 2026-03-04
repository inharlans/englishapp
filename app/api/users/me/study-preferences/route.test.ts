import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireUserFromRequest = vi.fn();
const mockCaptureAppError = vi.fn();
const mockGetStudyPreferences = vi.fn();

vi.mock("@/lib/api/route-helpers", () => ({
  requireUserFromRequest: mockRequireUserFromRequest
}));

vi.mock("@/lib/observability", () => ({
  captureAppError: mockCaptureAppError
}));

vi.mock("@/server/domain/mobile-home/service", () => ({
  MobileHomeService: class {
    getStudyPreferences = mockGetStudyPreferences;
  }
}));

function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized." }), {
    status: 401,
    headers: { "content-type": "application/json" }
  });
}

describe("GET /api/users/me/study-preferences", () => {
  function makeReq() {
    return new Request("http://localhost/api/users/me/study-preferences") as never;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: false, response: unauthorizedResponse() });
    const { GET } = await import("./route");

    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns preference payload when authenticated", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 7 } });
    mockGetStudyPreferences.mockResolvedValue({
      lastUsedWordbookId: "123",
      partSize: 20
    });
    const { GET } = await import("./route");

    const res = await GET(makeReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      lastUsedWordbookId: "123",
      partSize: 20
    });
  });
});
