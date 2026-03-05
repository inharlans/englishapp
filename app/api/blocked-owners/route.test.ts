import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAssertTrustedMutationRequest = vi.fn();
const mockRequireUserFromRequest = vi.fn();
const mockListBlockedOwners = vi.fn();
const mockRemoveBlockedOwner = vi.fn();

vi.mock("@/lib/requestSecurity", () => ({
  assertTrustedMutationRequest: mockAssertTrustedMutationRequest
}));

vi.mock("@/lib/api/route-helpers", () => ({
  requireUserFromRequest: mockRequireUserFromRequest
}));

vi.mock("@/server/domain/user/service", () => ({
  UserService: class {
    listBlockedOwners = mockListBlockedOwners;
    removeBlockedOwner = mockRemoveBlockedOwner;
  }
}));

function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized." }), {
    status: 401,
    headers: { "content-type": "application/json" }
  });
}

describe("/api/blocked-owners", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertTrustedMutationRequest.mockResolvedValue(null);
  });

  it("GET returns blocked owners for authenticated user", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 11 } });
    mockListBlockedOwners.mockResolvedValue({ blocks: [{ ownerId: 2 }] });
    const { GET } = await import("./route");

    const res = await GET(new Request("http://localhost/api/blocked-owners") as never);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ blocks: [{ ownerId: 2 }] });
  });

  it("DELETE removes owner block", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 11 } });
    const { DELETE } = await import("./route");

    const res = await DELETE(
      new Request("http://localhost/api/blocked-owners", {
        method: "DELETE",
        body: JSON.stringify({ ownerId: 2 }),
        headers: { "content-type": "application/json" }
      }) as never
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(mockRemoveBlockedOwner).toHaveBeenCalledWith(11, 2);
  });

  it("DELETE returns 401 when unauthenticated", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: false, response: unauthorizedResponse() });
    const { DELETE } = await import("./route");

    const res = await DELETE(
      new Request("http://localhost/api/blocked-owners", {
        method: "DELETE",
        body: JSON.stringify({ ownerId: 2 }),
        headers: { "content-type": "application/json" }
      }) as never
    );

    expect(res.status).toBe(401);
  });
});
