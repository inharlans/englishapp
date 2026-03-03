import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAssertTrustedMutationRequest = vi.fn();
const mockGetUserFromRequestCookies = vi.fn();
const mockGetUserFromRequest = vi.fn();
const mockRecordApiMetricFromStart = vi.fn();
const mockCaptureAppError = vi.fn();
const mockParseJsonWithSchema = vi.fn();
const mockGetPortOneConfig = vi.fn();
const mockNormalizeCycle = vi.fn();
const mockGetPublicOrigin = vi.fn();

vi.mock("@/lib/requestSecurity", () => ({
  assertTrustedMutationRequest: mockAssertTrustedMutationRequest
}));

vi.mock("@/lib/authServer", () => ({
  getUserFromRequestCookies: mockGetUserFromRequestCookies,
  getUserFromRequest: mockGetUserFromRequest
}));

vi.mock("@/lib/observability", () => ({
  recordApiMetricFromStart: mockRecordApiMetricFromStart,
  captureAppError: mockCaptureAppError
}));

vi.mock("@/lib/validation", () => ({
  parseJsonWithSchema: mockParseJsonWithSchema
}));

vi.mock("@/lib/payments", () => ({
  getPortOneConfig: mockGetPortOneConfig,
  normalizeCycle: mockNormalizeCycle
}));

vi.mock("@/lib/publicOrigin", () => ({
  getPublicOrigin: mockGetPublicOrigin
}));

function makeReq() {
  return { cookies: { get: vi.fn() } } as never;
}

describe("POST /api/payments/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertTrustedMutationRequest.mockReturnValue(null);
    mockRecordApiMetricFromStart.mockResolvedValue(undefined);
    mockCaptureAppError.mockResolvedValue(undefined);
    mockParseJsonWithSchema.mockResolvedValue({
      ok: true,
      data: { cycle: "monthly" }
    });
    mockNormalizeCycle.mockImplementation((v: string) =>
      v === "monthly" || v === "yearly" ? v : null
    );
    mockGetPortOneConfig.mockReturnValue({
      storeId: "store",
      channelKey: "channel",
      apiSecret: "sec",
      webhookSecret: "wh"
    });
    mockGetPublicOrigin.mockReturnValue("https://www.oingapp.com");
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUserFromRequest.mockResolvedValue(null);
    const { POST } = await import("./route");

    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns checkout payload for FREE user", async () => {
    mockGetUserFromRequest.mockResolvedValue({
      id: 11,
      email: "free-user@test.com",
      plan: "FREE",
      proUntil: null
    });
    const { POST } = await import("./route");

    const res = await POST(makeReq());
    const body = (await res.json()) as {
      cycle: "monthly" | "yearly";
      request: {
        redirectUrl: string;
        customer: { customerId: string; email: string };
        customData: { userId: number; cycle: "monthly" | "yearly" };
      };
    };

    expect(res.status).toBe(200);
    expect(body.cycle).toBe("monthly");
    expect(body.request.redirectUrl).toBe("https://www.oingapp.com/pricing");
    expect(body.request.customer.customerId).toBe("11");
    expect(body.request.customer.email).toBe("free-user@test.com");
    expect(body.request.customData).toEqual({ userId: 11, cycle: "monthly" });
  });
});
