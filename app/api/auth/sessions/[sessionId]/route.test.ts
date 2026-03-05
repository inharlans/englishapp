import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAssertTrustedMutationRequest = vi.fn();
const mockRequireUserFromRequest = vi.fn();
const mockUpdateMany = vi.fn();
const mockCaptureAppError = vi.fn();

vi.mock("@/lib/requestSecurity", () => ({
  assertTrustedMutationRequest: mockAssertTrustedMutationRequest
}));

vi.mock("@/lib/api/route-helpers", () => ({
  requireUserFromRequest: mockRequireUserFromRequest
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mobileRefreshToken: {
      updateMany: mockUpdateMany
    }
  }
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

describe("DELETE /api/auth/sessions/[sessionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertTrustedMutationRequest.mockResolvedValue(null);
  });

  it("returns 403 when request-security blocks the mutation", async () => {
    mockAssertTrustedMutationRequest.mockResolvedValue(
      new Response(JSON.stringify({ error: "blocked" }), { status: 403 })
    );
    const { DELETE } = await import("./route");

    const res = await DELETE(new Request("http://localhost/api/auth/sessions/10") as never, {
      params: Promise.resolve({ sessionId: "10" })
    });

    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: false, response: unauthorizedResponse() });
    const { DELETE } = await import("./route");

    const res = await DELETE(new Request("http://localhost/api/auth/sessions/10") as never, {
      params: Promise.resolve({ sessionId: "10" })
    });

    expect(res.status).toBe(401);
  });

  it("revokes the selected session and returns 200", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 2 } });
    mockUpdateMany.mockResolvedValue({ count: 1 });
    const { DELETE } = await import("./route");

    const res = await DELETE(new Request("http://localhost/api/auth/sessions/10") as never, {
      params: Promise.resolve({ sessionId: "10" })
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      revokedCount: 1,
      accessTokenRevoked: false,
      accessTokenTtlSeconds: 900
    });
  });

  it("uses session id param value for revoke", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 2 } });
    mockUpdateMany.mockResolvedValue({ count: 1 });
    const { DELETE } = await import("./route");

    const sessionId = "37";
    const res = await DELETE(new Request("http://localhost/api/auth/sessions/37") as never, {
      params: Promise.resolve({ sessionId })
    });

    expect(res.status).toBe(200);
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 37 })
      })
    );
  });

  it("returns 400 for non-numeric session id", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 2 } });
    const { DELETE } = await import("./route");

    const sessionId = "pixel%pro";
    const res = await DELETE(new Request("http://localhost/api/auth/sessions/pixel%25pro") as never, {
      params: Promise.resolve({ sessionId })
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 for encoded non-numeric session id", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 2 } });
    const { DELETE } = await import("./route");

    const sessionId = "pixel%20pro";
    const res = await DELETE(new Request("http://localhost/api/auth/sessions/pixel%2520pro") as never, {
      params: Promise.resolve({ sessionId })
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 for coerced numeric format", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 2 } });
    const { DELETE } = await import("./route");

    const res = await DELETE(new Request("http://localhost/api/auth/sessions/1e2") as never, {
      params: Promise.resolve({ sessionId: "1e2" })
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 for out-of-range session id", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 2 } });
    const { DELETE } = await import("./route");

    const res = await DELETE(new Request("http://localhost/api/auth/sessions/2147483648") as never, {
      params: Promise.resolve({ sessionId: "2147483648" })
    });

    expect(res.status).toBe(400);
  });

  it("returns 500 when revoke query fails", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 2 } });
    mockUpdateMany.mockRejectedValue(new Error("db down"));
    const { DELETE } = await import("./route");

    const res = await DELETE(new Request("http://localhost/api/auth/sessions/10") as never, {
      params: Promise.resolve({ sessionId: "10" })
    });

    expect(res.status).toBe(500);
    expect(mockCaptureAppError).toHaveBeenCalledTimes(1);
  });
});
