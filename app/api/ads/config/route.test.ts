import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireUserFromRequest = vi.fn();

vi.mock("@/lib/api/route-helpers", () => ({
  requireUserFromRequest: mockRequireUserFromRequest
}));

function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized." }), {
    status: 401,
    headers: { "content-type": "application/json" }
  });
}

describe("GET /api/ads/config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: false, response: unauthorizedResponse() });
    const { GET } = await import("./route");

    const res = await GET({} as never);
    expect(res.status).toBe(401);
  });

  it("returns fallback ads payload when authenticated", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 7 } });
    const { GET } = await import("./route");

    const res = await GET({} as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      slots: { HOME_BANNER: false },
      isFallback: true
    });
  });
});
