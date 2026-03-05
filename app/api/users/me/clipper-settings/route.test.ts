import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAssertTrustedMutationRequest = vi.fn();
const mockRequireUserFromRequest = vi.fn();
const mockGetSettings = vi.fn();
const mockUpdateSettings = vi.fn();

vi.mock("@/lib/requestSecurity", () => ({
  assertTrustedMutationRequest: mockAssertTrustedMutationRequest
}));

vi.mock("@/lib/api/route-helpers", () => ({
  requireUserFromRequest: mockRequireUserFromRequest
}));

vi.mock("@/server/domain/clipper/service", () => ({
  ClipperService: class {
    getSettings = mockGetSettings;
    updateSettings = mockUpdateSettings;
  }
}));

function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized." }), {
    status: 401,
    headers: { "content-type": "application/json" }
  });
}

describe("/api/users/me/clipper-settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertTrustedMutationRequest.mockResolvedValue(null);
  });

  it("GET returns settings for authenticated user", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 5, email: "u@test.com" } });
    mockGetSettings.mockResolvedValue({ ok: true, status: 200, payload: { defaultWordbookId: 3 } });
    const { GET } = await import("./route");

    const res = await GET(new Request("http://localhost/api/users/me/clipper-settings") as never);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ defaultWordbookId: 3 });
  });

  it("PATCH updates defaultWordbookId", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 5, email: "u@test.com" } });
    mockUpdateSettings.mockResolvedValue({ ok: true, status: 200, payload: { ok: true, defaultWordbookId: 7 } });
    const { PATCH } = await import("./route");

    const res = await PATCH(
      new Request("http://localhost/api/users/me/clipper-settings", {
        method: "PATCH",
        body: JSON.stringify({ defaultWordbookId: 7 }),
        headers: { "content-type": "application/json" }
      }) as never
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, defaultWordbookId: 7 });
  });

  it("PATCH returns 401 when unauthenticated", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: false, response: unauthorizedResponse() });
    const { PATCH } = await import("./route");

    const res = await PATCH(
      new Request("http://localhost/api/users/me/clipper-settings", {
        method: "PATCH",
        body: JSON.stringify({ defaultWordbookId: null }),
        headers: { "content-type": "application/json" }
      }) as never
    );

    expect(res.status).toBe(401);
  });
});
