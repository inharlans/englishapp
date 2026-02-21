import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAssertTrustedMutationRequest = vi.fn();
const mockGetUserFromRequestCookies = vi.fn();
const mockRecordApiMetricFromStart = vi.fn();
const mockCaptureAppError = vi.fn();
const mockGetPortOnePaymentClient = vi.fn();
const mockGetPortOneConfig = vi.fn();
const mockGetPublicOrigin = vi.fn();

const mockPrismaUserFindUnique = vi.fn();
const mockPrismaUserUpdate = vi.fn();
const mockRevokePaymentSchedules = vi.fn();

vi.mock("@/lib/requestSecurity", () => ({
  assertTrustedMutationRequest: mockAssertTrustedMutationRequest
}));

vi.mock("@/lib/authServer", () => ({
  getUserFromRequestCookies: mockGetUserFromRequestCookies
}));

vi.mock("@/lib/observability", () => ({
  recordApiMetricFromStart: mockRecordApiMetricFromStart,
  captureAppError: mockCaptureAppError
}));

vi.mock("@/lib/payments", () => ({
  getPortOnePaymentClient: mockGetPortOnePaymentClient,
  getPortOneConfig: mockGetPortOneConfig
}));

vi.mock("@/lib/publicOrigin", () => ({
  getPublicOrigin: mockGetPublicOrigin
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockPrismaUserFindUnique,
      update: mockPrismaUserUpdate
    }
  }
}));

function makeReq() {
  return { cookies: { get: vi.fn() } } as never;
}

describe("POST /api/payments/portal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertTrustedMutationRequest.mockReturnValue(null);
    mockRecordApiMetricFromStart.mockResolvedValue(undefined);
    mockCaptureAppError.mockResolvedValue(undefined);
    mockGetPortOneConfig.mockReturnValue({
      storeId: "store",
      channelKey: "channel",
      apiSecret: "sec",
      webhookSecret: "wh"
    });
    mockGetPortOnePaymentClient.mockReturnValue({
      paymentSchedule: {
        revokePaymentSchedules: mockRevokePaymentSchedules
      }
    });
    mockGetPublicOrigin.mockReturnValue("https://www.oingapp.com");
    mockPrismaUserUpdate.mockResolvedValue(undefined);
    mockRevokePaymentSchedules.mockResolvedValue(undefined);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUserFromRequestCookies.mockResolvedValue(null);
    const { POST } = await import("./route");

    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 400 for FREE user without billing key", async () => {
    mockGetUserFromRequestCookies.mockResolvedValue({
      id: 21,
      email: "free-user@test.com",
      plan: "FREE",
      proUntil: null
    });
    mockPrismaUserFindUnique.mockResolvedValue({
      stripeCustomerId: null,
      stripeSubscriptionStatus: null
    });
    const { POST } = await import("./route");

    const res = await POST(makeReq());
    const body = (await res.json()) as { error?: string };

    expect(res.status).toBe(400);
    expect(body.error).toBe("연결된 구독 결제 수단이 없습니다.");
    expect(mockRevokePaymentSchedules).not.toHaveBeenCalled();
    expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
  });
});
