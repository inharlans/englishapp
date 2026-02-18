import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAssertTrustedMutationRequest = vi.fn();
const mockGetUserFromRequestCookies = vi.fn();
const mockRecordApiMetricFromStart = vi.fn();
const mockCaptureAppError = vi.fn();
const mockParseJsonWithSchema = vi.fn();
const mockGetPortOnePaymentClient = vi.fn();
const mockGetPortOneConfig = vi.fn();
const mockGetPlanAmountKrw = vi.fn();
const mockNormalizeCycle = vi.fn();
const mockApplyPaidEntitlementOnce = vi.fn();
const mockComputeNextProUntil = vi.fn();
const mockComputeNextScheduleAt = vi.fn();

const mockPayWithBillingKey = vi.fn();
const mockGetPayment = vi.fn();
const mockCreatePaymentSchedule = vi.fn();
const mockPrismaTxPaymentEventCreate = vi.fn();
const mockPrismaUserUpdate = vi.fn();

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

vi.mock("@/lib/validation", () => ({
  parseJsonWithSchema: mockParseJsonWithSchema
}));

vi.mock("@/lib/payments", () => ({
  getPortOnePaymentClient: mockGetPortOnePaymentClient,
  getPortOneConfig: mockGetPortOneConfig,
  getPlanAmountKrw: mockGetPlanAmountKrw,
  normalizeCycle: mockNormalizeCycle
}));

vi.mock("@/lib/paymentsEntitlement", () => ({
  applyPaidEntitlementOnce: mockApplyPaidEntitlementOnce,
  computeNextProUntil: mockComputeNextProUntil,
  computeNextScheduleAt: mockComputeNextScheduleAt
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (cb: (tx: unknown) => unknown) =>
      cb({
        paymentEvent: { create: mockPrismaTxPaymentEventCreate }
      }),
    user: {
      update: mockPrismaUserUpdate
    }
  }
}));

function makeReq() {
  return { cookies: { get: vi.fn() } } as never;
}

describe("POST /api/payments/confirm", () => {
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
      payWithBillingKey: mockPayWithBillingKey,
      getPayment: mockGetPayment,
      paymentSchedule: {
        createPaymentSchedule: mockCreatePaymentSchedule
      }
    });
    mockGetPlanAmountKrw.mockReturnValue(2900);
    mockNormalizeCycle.mockImplementation((v: string) =>
      v === "monthly" || v === "yearly" ? v : null
    );
    mockParseJsonWithSchema.mockResolvedValue({
      ok: true,
      data: { billingKey: "bk_test", cycle: "monthly" }
    });
    mockComputeNextProUntil.mockReturnValue(new Date("2026-03-20T00:00:00.000Z"));
    mockComputeNextScheduleAt.mockImplementation((d: Date) => d);
    mockPayWithBillingKey.mockResolvedValue(undefined);
    mockGetPayment.mockResolvedValue({
      status: "PAID",
      amount: { total: 2900 },
      currency: "KRW",
      billingKey: "bk_live"
    });
    mockCreatePaymentSchedule.mockResolvedValue({
      schedule: { id: "sch_1" }
    });
    mockPrismaTxPaymentEventCreate.mockResolvedValue(undefined);
    mockPrismaUserUpdate.mockResolvedValue(undefined);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUserFromRequestCookies.mockResolvedValue(null);
    const { POST } = await import("./route");

    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("applies payment and schedules renewal once", async () => {
    mockGetUserFromRequestCookies.mockResolvedValue({
      id: 7,
      email: "u@test.com",
      proUntil: null
    });
    mockApplyPaidEntitlementOnce.mockResolvedValue({ applied: true });
    const { POST } = await import("./route");

    const res = await POST(makeReq());
    const body = (await res.json()) as { ok: boolean; applied: boolean };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.applied).toBe(true);
    expect(mockApplyPaidEntitlementOnce).toHaveBeenCalledTimes(1);
    expect(mockCreatePaymentSchedule).toHaveBeenCalledTimes(1);
    expect(mockPrismaUserUpdate).toHaveBeenCalledTimes(1);
  });

  it("does not schedule when entitlement was already applied", async () => {
    mockGetUserFromRequestCookies.mockResolvedValue({
      id: 7,
      email: "u@test.com",
      proUntil: null
    });
    mockApplyPaidEntitlementOnce.mockResolvedValue({ applied: false });
    const { POST } = await import("./route");

    const res = await POST(makeReq());
    const body = (await res.json()) as { ok: boolean; applied: boolean };

    expect(res.status).toBe(200);
    expect(body.applied).toBe(false);
    expect(mockCreatePaymentSchedule).not.toHaveBeenCalled();
    expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 when paid amount is unexpected", async () => {
    mockGetUserFromRequestCookies.mockResolvedValue({
      id: 7,
      email: "u@test.com",
      proUntil: null
    });
    mockGetPayment.mockResolvedValue({
      status: "PAID",
      amount: { total: 1111 },
      currency: "KRW",
      billingKey: "bk_live"
    });
    const { POST } = await import("./route");

    const res = await POST(makeReq());
    expect(res.status).toBe(400);
  });
});
