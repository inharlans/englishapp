import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAssertTrustedMutationRequest = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetClientIpFromHeaders = vi.fn();
const mockParsePositiveIntParam = vi.fn();
const mockRequireUserFromRequest = vi.fn();
const mockSubmitWordbookQuizAnswer = vi.fn();
const mockParseQuizMode = vi.fn();
const mockCaptureAppError = vi.fn();

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

vi.mock("@/server/domain/quiz/service", () => ({
  parseQuizMode: mockParseQuizMode,
  QuizService: class {
    submitWordbookQuizAnswer = mockSubmitWordbookQuizAnswer;
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

describe("POST /api/wordbooks/[id]/quiz/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertTrustedMutationRequest.mockResolvedValue(null);
    mockGetClientIpFromHeaders.mockReturnValue("127.0.0.1");
    mockCheckRateLimit.mockResolvedValue({ ok: true });
    mockParsePositiveIntParam.mockImplementation((value: string) => Number(value));
    mockRequireUserFromRequest.mockResolvedValue({ ok: true, user: { id: 7, email: "u@test.com" } });
    mockParseQuizMode.mockReturnValue("MEANING");
    mockSubmitWordbookQuizAnswer.mockResolvedValue({
      ok: true,
      status: 200,
      payload: {
        correct: true,
        expected: "apple",
        gradingDiagnosis: {
          potentiallyDisputable: false,
          similarityScore: 1
        }
      }
    });
  });

  it("returns 403 when blocked by mutation guard", async () => {
    mockAssertTrustedMutationRequest.mockResolvedValue(
      new Response(JSON.stringify({ error: "Forbidden." }), { status: 403 })
    );
    const { POST } = await import("./route");

    const res = await POST(new Request("http://localhost/api/x", { method: "POST" }) as never, {
      params: Promise.resolve({ id: "1" })
    });

    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid wordbook id", async () => {
    mockParsePositiveIntParam.mockReturnValue(0);
    const { POST } = await import("./route");

    const res = await POST(new Request("http://localhost/api/x", { method: "POST" }) as never, {
      params: Promise.resolve({ id: "invalid" })
    });

    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireUserFromRequest.mockResolvedValue({ ok: false, response: unauthorizedResponse() });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/x", {
        method: "POST",
        body: JSON.stringify({ itemId: 10, answer: "apple" }),
        headers: { "content-type": "application/json" }
      }) as never,
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(res.status).toBe(401);
  });

  it("submits quiz answer and returns payload", async () => {
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/x", {
        method: "POST",
        body: JSON.stringify({ itemId: 10, mode: "WORD", answer: "apple" }),
        headers: { "content-type": "application/json" }
      }) as never,
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ correct: true, expected: "apple" });
    expect(mockParseQuizMode).toHaveBeenCalledWith("WORD");
    expect(mockSubmitWordbookQuizAnswer).toHaveBeenCalledWith({ id: 7, email: "u@test.com" }, 1, {
      itemId: 10,
      mode: "MEANING",
      answer: "apple"
    });
  });

  it("captures diagnostic warning when answer is incorrect", async () => {
    mockSubmitWordbookQuizAnswer.mockResolvedValue({
      ok: true,
      status: 200,
      payload: {
        correct: false,
        expected: "apple",
        gradingDiagnosis: {
          potentiallyDisputable: true,
          similarityScore: 0.6
        }
      }
    });
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/x", {
        method: "POST",
        body: JSON.stringify({ itemId: 10, mode: "MEANING", answer: "appl" }),
        headers: { "content-type": "application/json" }
      }) as never,
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(res.status).toBe(200);
    expect(mockCaptureAppError).toHaveBeenCalledTimes(1);
  });
});
