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

describe("GET /api/llm/quota", () => {
  function makeReq() {
    return new Request("http://localhost/api/llm/quota") as never;
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

  it("returns fallback quota payload when authenticated", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 7 } });
    const { GET } = await import("./route");

    const res = await GET(makeReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      used: 0,
      limit: 100,
      isFallback: true
    });
  });
});
