import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCheckRateLimit = vi.fn();
const mockGetClientIpFromHeaders = vi.fn();
const mockCaptureAppError = vi.fn();
const mockRecordApiMetric = vi.fn();
const mockParseJsonWithSchema = vi.fn();

const mockIsPasswordLoginAllowedInCurrentEnv = vi.fn();
const mockLogin = vi.fn();
const mockGetCookieNames = vi.fn();

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mockCheckRateLimit,
  getClientIpFromHeaders: mockGetClientIpFromHeaders
}));

vi.mock("@/lib/observability", () => ({
  captureAppError: mockCaptureAppError,
  recordApiMetric: mockRecordApiMetric
}));

vi.mock("@/lib/validation", () => ({
  parseJsonWithSchema: mockParseJsonWithSchema
}));

vi.mock("@/server/domain/auth/service", () => ({
  AuthService: class {
    isPasswordLoginAllowedInCurrentEnv = mockIsPasswordLoginAllowedInCurrentEnv;
    login = mockLogin;
    getCookieNames = mockGetCookieNames;
  }
}));

function makeReq() {
  return { headers: new Headers() } as never;
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();

    mockCheckRateLimit.mockResolvedValue({ ok: true });
    mockGetClientIpFromHeaders.mockReturnValue("127.0.0.1");
    mockCaptureAppError.mockResolvedValue(undefined);
    mockRecordApiMetric.mockResolvedValue(undefined);
    mockParseJsonWithSchema.mockResolvedValue({
      ok: true,
      data: { email: "user@example.com", password: "pw" }
    });
    mockGetCookieNames.mockReturnValue({
      sessionCookieName: "session_token",
      csrfCookieName: "csrf_token"
    });
  });

  it("blocks non-admin password login in production mode", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mockIsPasswordLoginAllowedInCurrentEnv.mockResolvedValue(false);

    const { POST } = await import("./route");
    const res = await POST(makeReq());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.code).toBe("PASSWORD_LOGIN_DISABLED");
    expect(mockCaptureAppError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "password_login_disabled_attempt",
        context: expect.objectContaining({ code: "PASSWORD_LOGIN_DISABLED" })
      })
    );
  });

  it("returns success and sets cookies when login is allowed", async () => {
    mockIsPasswordLoginAllowedInCurrentEnv.mockResolvedValue(true);
    mockLogin.mockResolvedValue({
      user: { id: 7, email: "user@example.com" },
      sessionToken: "session-token-value",
      csrfToken: "csrf-token-value"
    });

    const { POST } = await import("./route");
    const res = await POST(makeReq());

    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("session_token=session-token-value");
    expect(setCookie).toContain("csrf_token=csrf-token-value");
  });
});
