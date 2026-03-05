import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAssertTrustedMutationRequest = vi.fn();
const mockRequireUserFromRequest = vi.fn();
const mockUpdateDailyGoal = vi.fn();

vi.mock("@/lib/requestSecurity", () => ({
  assertTrustedMutationRequest: mockAssertTrustedMutationRequest
}));

vi.mock("@/lib/api/route-helpers", () => ({
  requireUserFromRequest: mockRequireUserFromRequest
}));

vi.mock("@/server/domain/user/service", () => ({
  UserService: class {
    updateDailyGoal = mockUpdateDailyGoal;
  }
}));

function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized." }), {
    status: 401,
    headers: { "content-type": "application/json" }
  });
}

describe("POST /api/users/me/daily-goal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertTrustedMutationRequest.mockResolvedValue(null);
  });

  it("returns requestSecurity response when blocked", async () => {
    mockAssertTrustedMutationRequest.mockResolvedValue(
      new Response(JSON.stringify({ error: "Forbidden." }), { status: 403 })
    );
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/users/me/daily-goal", {
        method: "POST",
        body: JSON.stringify({ dailyGoal: 30 }),
        headers: { "content-type": "application/json" }
      }) as never
    );

    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: false, response: unauthorizedResponse() });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/users/me/daily-goal", {
        method: "POST",
        body: JSON.stringify({ dailyGoal: 30 }),
        headers: { "content-type": "application/json" }
      }) as never
    );

    expect(res.status).toBe(401);
  });

  it("updates daily goal with valid payload", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 9 } });
    mockUpdateDailyGoal.mockResolvedValue({ ok: true, dailyGoal: 45 });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/users/me/daily-goal", {
        method: "POST",
        body: JSON.stringify({ dailyGoal: 45 }),
        headers: { "content-type": "application/json" }
      }) as never
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, dailyGoal: 45 });
  });
});
