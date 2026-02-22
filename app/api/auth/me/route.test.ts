import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUserFromRequestCookies = vi.fn();
const mockRecordApiMetricFromStart = vi.fn();
const mockCaptureAppError = vi.fn();
const mockGetUserDownloadedWordCount = vi.fn();
const mockIsActiveProPlan = vi.fn();
const mockIssueCsrfToken = vi.fn();
const mockGetCsrfCookieName = vi.fn();

vi.mock("@/lib/authServer", () => ({
  getUserFromRequestCookies: mockGetUserFromRequestCookies
}));

vi.mock("@/lib/observability", () => ({
  recordApiMetricFromStart: mockRecordApiMetricFromStart,
  captureAppError: mockCaptureAppError
}));

vi.mock("@/lib/planLimits", () => ({
  FREE_DOWNLOAD_WORD_LIMIT: 1000,
  getUserDownloadedWordCount: mockGetUserDownloadedWordCount
}));

vi.mock("@/lib/userPlan", () => ({
  isActiveProPlan: mockIsActiveProPlan
}));

vi.mock("@/lib/csrf", () => ({
  issueCsrfToken: mockIssueCsrfToken,
  getCsrfCookieName: mockGetCsrfCookieName
}));

function makeReq(withCsrfCookie = false) {
  return {
    cookies: {
      get: vi.fn((name: string) =>
        withCsrfCookie && name === "csrf_token" ? { value: "existing-csrf" } : undefined
      )
    }
  } as never;
}

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecordApiMetricFromStart.mockResolvedValue(undefined);
    mockCaptureAppError.mockResolvedValue(undefined);
    mockGetUserDownloadedWordCount.mockResolvedValue(0);
    mockIsActiveProPlan.mockReturnValue(false);
    mockIssueCsrfToken.mockReturnValue("new-csrf-token");
    mockGetCsrfCookieName.mockReturnValue("csrf_token");
  });

  it("returns user null when session cookie is missing", async () => {
    mockGetUserFromRequestCookies.mockResolvedValue(null);
    const { GET } = await import("./route");

    const res = await GET(makeReq(false));
    const body = (await res.json()) as { user: null };

    expect(res.status).toBe(200);
    expect(body.user).toBeNull();
    expect(mockGetUserDownloadedWordCount).not.toHaveBeenCalled();
  });

  it("sets csrf cookie when authenticated user has no csrf cookie", async () => {
    mockGetUserFromRequestCookies.mockResolvedValue({
      id: 7,
      email: "user@test.com",
      isAdmin: false,
      dailyGoal: 20,
      plan: "FREE",
      proUntil: null
    });
    const { GET } = await import("./route");

    const res = await GET(makeReq(false));
    const body = (await res.json()) as { user: { id: number } };

    expect(res.status).toBe(200);
    expect(body.user.id).toBe(7);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("csrf_token=");
  });
});
