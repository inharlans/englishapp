import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireUserFromRequest = vi.fn();
const mockCaptureAppError = vi.fn();
const mockGetStudyPreferences = vi.fn();
const mockUpdateStudyPreferences = vi.fn();
const mockAssertTrustedMutationRequest = vi.fn();

vi.mock("@/lib/api/route-helpers", () => ({
  requireUserFromRequest: mockRequireUserFromRequest
}));

vi.mock("@/lib/observability", () => ({
  captureAppError: mockCaptureAppError
}));

vi.mock("@/lib/requestSecurity", () => ({
  assertTrustedMutationRequest: mockAssertTrustedMutationRequest
}));

vi.mock("@/server/domain/mobile-home/service", () => ({
  MobileHomeService: class {
    getStudyPreferences = mockGetStudyPreferences;
    updateStudyPreferences = mockUpdateStudyPreferences;
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

describe("PATCH /api/users/me/study-preferences", () => {
  function makeReq(body: unknown) {
    return new Request("http://localhost/api/users/me/study-preferences", {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" }
    }) as never;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertTrustedMutationRequest.mockResolvedValue(null);
  });

  it("returns 403 when request-security blocks the mutation", async () => {
    mockAssertTrustedMutationRequest.mockResolvedValue(
      new Response(JSON.stringify({ error: "Forbidden." }), { status: 403 })
    );
    const { PATCH } = await import("./route");

    const res = await PATCH(makeReq({ partSize: 20 }));
    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: false, response: unauthorizedResponse() });
    const { PATCH } = await import("./route");

    const res = await PATCH(makeReq({ partSize: 20 }));
    expect(res.status).toBe(401);
  });

  it("returns merged payload with requested partSize", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 7 } });
    mockUpdateStudyPreferences.mockResolvedValue({
      lastUsedWordbookId: "123",
      partSize: 15
    });
    const { PATCH } = await import("./route");

    const res = await PATCH(makeReq({ partSize: 15 }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      lastUsedWordbookId: "123",
      partSize: 15
    });
    expect(mockUpdateStudyPreferences).toHaveBeenCalledWith(7, { partSize: 15 });
  });

  it("returns 400 on invalid payload", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 7 } });
    const { PATCH } = await import("./route");

    const res = await PATCH(makeReq({ partSize: 0 }));
    expect(res.status).toBe(400);
  });

  it("accepts partSize up to 100", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 7 } });
    mockUpdateStudyPreferences.mockResolvedValue({
      lastUsedWordbookId: "123",
      partSize: 100
    });
    const { PATCH } = await import("./route");

    const res = await PATCH(makeReq({ partSize: 100 }));
    expect(res.status).toBe(200);
  });
});
