import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAssertTrustedMutationRequest = vi.fn();
const mockRecordApiMetricFromStart = vi.fn();
const mockCaptureAppError = vi.fn();
const mockGetSessionCookieName = vi.fn();
const mockGetCsrfCookieName = vi.fn();

vi.mock("@/lib/requestSecurity", () => ({
  assertTrustedMutationRequest: mockAssertTrustedMutationRequest
}));

vi.mock("@/lib/observability", () => ({
  recordApiMetricFromStart: mockRecordApiMetricFromStart,
  captureAppError: mockCaptureAppError
}));

vi.mock("@/lib/authJwt", () => ({
  getSessionCookieName: mockGetSessionCookieName
}));

vi.mock("@/lib/csrf", () => ({
  getCsrfCookieName: mockGetCsrfCookieName
}));

function makeReq() {
  return { headers: new Headers(), cookies: { get: vi.fn() } } as never;
}

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecordApiMetricFromStart.mockResolvedValue(undefined);
    mockCaptureAppError.mockResolvedValue(undefined);
    mockGetSessionCookieName.mockReturnValue("session_token");
    mockGetCsrfCookieName.mockReturnValue("csrf_token");
  });

  it("returns 403 when csrf validation fails", async () => {
    mockAssertTrustedMutationRequest.mockReturnValue(
      new Response(JSON.stringify({ error: "Forbidden." }), { status: 403 })
    );
    const { POST } = await import("./route");

    const res = await POST(makeReq());
    expect(res.status).toBe(403);
  });

  it("clears auth cookies on success", async () => {
    mockAssertTrustedMutationRequest.mockReturnValue(null);
    const { POST } = await import("./route");

    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("session_token=");
    expect(setCookie).toContain("csrf_token=");
  });
});
