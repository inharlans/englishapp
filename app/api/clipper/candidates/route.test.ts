import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireUserFromRequest = vi.fn();
const mockCaptureAppError = vi.fn();
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

function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized." }), {
    status: 401,
    headers: { "content-type": "application/json" }
  });
}

describe("POST /api/clipper/candidates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertTrustedMutationRequest.mockResolvedValue(null);
  });

  it("returns 403 when request-security blocks mutation", async () => {
    mockAssertTrustedMutationRequest.mockResolvedValue(
      new Response(JSON.stringify({ error: "Forbidden." }), { status: 403 })
    );
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/clipper/candidates", {
        method: "POST",
        body: JSON.stringify({ rawText: "sample" }),
        headers: { "content-type": "application/json" }
      }) as never
    );

    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: false, response: unauthorizedResponse() });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/clipper/candidates", {
        method: "POST",
        body: JSON.stringify({ rawText: "sample" }),
        headers: { "content-type": "application/json" }
      }) as never
    );

    expect(res.status).toBe(401);
  });

  it("extracts candidates from text", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 3 } });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/clipper/candidates", {
        method: "POST",
        body: JSON.stringify({ rawText: "apple apple banana and banana orange" }),
        headers: { "content-type": "application/json" }
      }) as never
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.candidates.slice(0, 3)).toEqual(["apple", "banana", "orange"]);
  });

  it("returns 500 when auth helper throws", async () => {
    mockRequireUserFromRequest.mockRejectedValue(new Error("boom"));
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/clipper/candidates", {
        method: "POST",
        body: JSON.stringify({ rawText: "sample" }),
        headers: { "content-type": "application/json" }
      }) as never
    );

    expect(res.status).toBe(500);
    expect(mockCaptureAppError).toHaveBeenCalledTimes(1);
  });
});
