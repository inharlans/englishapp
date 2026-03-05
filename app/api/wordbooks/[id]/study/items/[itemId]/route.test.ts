import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAssertTrustedMutationRequest = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetClientIpFromHeaders = vi.fn();
const mockParsePositiveIntParam = vi.fn();
const mockRequireUserFromRequest = vi.fn();
const mockCanAccessWordbookForStudy = vi.fn();
const mockSubmitResult = vi.fn();

vi.mock("@/lib/requestSecurity", () => ({
  assertTrustedMutationRequest: mockAssertTrustedMutationRequest
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mockCheckRateLimit,
  getClientIpFromHeaders: mockGetClientIpFromHeaders
}));

vi.mock("@/lib/api/route-helpers", () => ({
  parsePositiveIntParam: mockParsePositiveIntParam,
  requireUserFromRequest: mockRequireUserFromRequest
}));

vi.mock("@/lib/wordbookAccess", () => ({
  canAccessWordbookForStudy: mockCanAccessWordbookForStudy
}));

vi.mock("@/server/domain/wordbook/study-item-service", () => ({
  WordbookStudyItemService: class {
    submitResult = mockSubmitResult;
  }
}));

function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized." }), {
    status: 401,
    headers: { "content-type": "application/json" }
  });
}

describe("POST /api/wordbooks/[id]/study/items/[itemId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertTrustedMutationRequest.mockResolvedValue(null);
    mockGetClientIpFromHeaders.mockReturnValue("127.0.0.1");
    mockCheckRateLimit.mockResolvedValue({ ok: true });
    mockParsePositiveIntParam.mockImplementation((value: string) => Number(value));
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 3 } });
    mockCanAccessWordbookForStudy.mockResolvedValue(true);
    mockSubmitResult.mockResolvedValue({ ok: true, payload: { ok: true }, status: 200 });
  });

  it("returns blocked response from mutation guard", async () => {
    mockAssertTrustedMutationRequest.mockResolvedValue(
      new Response(JSON.stringify({ error: "Forbidden." }), { status: 403 })
    );
    const { POST } = await import("./route");

    const res = await POST(new Request("http://localhost/api/x", { method: "POST" }) as never, {
      params: Promise.resolve({ id: "1", itemId: "2" })
    });

    expect(res.status).toBe(403);
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 10 });
    const { POST } = await import("./route");

    const res = await POST(new Request("http://localhost/api/x", { method: "POST" }) as never, {
      params: Promise.resolve({ id: "1", itemId: "2" })
    });

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("10");
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: false, response: unauthorizedResponse() });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/x", {
        method: "POST",
        body: JSON.stringify({ result: "CORRECT" }),
        headers: { "content-type": "application/json" }
      }) as never,
      { params: Promise.resolve({ id: "1", itemId: "2" }) }
    );

    expect(res.status).toBe(401);
  });

  it("submits study result and returns payload", async () => {
    mockSubmitResult.mockResolvedValue({
      ok: true,
      status: 200,
      payload: {
        studiedCount: 10,
        correctCount: 8,
        wrongCount: 2
      }
    });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/x", {
        method: "POST",
        body: JSON.stringify({ result: "CORRECT" }),
        headers: { "content-type": "application/json" }
      }) as never,
      { params: Promise.resolve({ id: "1", itemId: "2" }) }
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      studiedCount: 10,
      correctCount: 8,
      wrongCount: 2
    });
    expect(mockSubmitResult).toHaveBeenCalledWith({
      userId: 3,
      wordbookId: 1,
      itemId: 2,
      result: "CORRECT"
    });
  });
});
