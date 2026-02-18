import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRecordApiMetricFromStart = vi.fn();
const mockCaptureAppError = vi.fn();
const mockGetPortOneConfig = vi.fn();
const mockGetPortOnePaymentClient = vi.fn();
const mockGetPlanAmountKrw = vi.fn();
const mockNormalizeCycle = vi.fn();
const mockApplyPaidEntitlementOnce = vi.fn();
const mockComputeNextProUntil = vi.fn();
const mockComputeNextScheduleAt = vi.fn();

const mockWebhookVerify = vi.fn();
const mockPaymentGet = vi.fn();
const mockCreatePaymentSchedule = vi.fn();

const mockPaymentEventFindUnique = vi.fn();
const mockPaymentEventFindFirst = vi.fn();
const mockPaymentEventCreate = vi.fn();
const mockUserFindFirst = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();

vi.mock("@/lib/observability", () => ({
  recordApiMetricFromStart: mockRecordApiMetricFromStart,
  captureAppError: mockCaptureAppError
}));

vi.mock("@/lib/payments", () => ({
  getPortOneConfig: mockGetPortOneConfig,
  getPortOnePaymentClient: mockGetPortOnePaymentClient,
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
    paymentEvent: {
      findUnique: mockPaymentEventFindUnique,
      findFirst: mockPaymentEventFindFirst,
      create: mockPaymentEventCreate
    },
    user: {
      findFirst: mockUserFindFirst,
      findUnique: mockUserFindUnique,
      update: mockUserUpdate
    },
    $transaction: async (cb: (tx: unknown) => unknown) =>
      cb({
        paymentEvent: { create: mockPaymentEventCreate },
        user: { update: mockUserUpdate }
      })
  }
}));

vi.mock("@portone/server-sdk", () => ({
  Webhook: {
    verify: mockWebhookVerify
  }
}));

function makeReq(headers: Record<string, string>, body = "{}") {
  return new Request("http://127.0.0.1:3000/api/payments/webhook", {
    method: "POST",
    headers,
    body
  }) as never;
}

describe("POST /api/payments/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPortOneConfig.mockReturnValue({
      apiSecret: "sec",
      webhookSecret: "wh",
      storeId: "store",
      channelKey: "channel"
    });
    mockGetPortOnePaymentClient.mockReturnValue({
      getPayment: mockPaymentGet,
      paymentSchedule: {
        createPaymentSchedule: mockCreatePaymentSchedule
      }
    });
    mockGetPlanAmountKrw.mockReturnValue(2900);
    mockNormalizeCycle.mockImplementation((v: string) =>
      v === "monthly" || v === "yearly" ? v : null
    );
    mockComputeNextProUntil.mockReturnValue(new Date("2026-03-20T00:00:00.000Z"));
    mockComputeNextScheduleAt.mockImplementation((d: Date) => d);
    mockPaymentEventFindUnique.mockResolvedValue(null);
    mockPaymentEventCreate.mockResolvedValue(undefined);
    mockUserFindFirst.mockResolvedValue(null);
    mockPaymentEventFindFirst.mockResolvedValue(null);
    mockUserUpdate.mockResolvedValue(undefined);
    mockRecordApiMetricFromStart.mockResolvedValue(undefined);
    mockCaptureAppError.mockResolvedValue(undefined);
  });

  it("returns duplicate true when webhook id already processed", async () => {
    mockWebhookVerify.mockResolvedValue({
      type: "Transaction.Paid",
      data: { paymentId: "pay_1" }
    });
    mockPaymentEventFindUnique.mockResolvedValue({ id: 1 });
    const { POST } = await import("./route");

    const res = await POST(
      makeReq({
        "webhook-id": "wh_1",
        "webhook-signature": "sig",
        "webhook-timestamp": "1"
      })
    );
    const body = (await res.json()) as { ok: boolean; duplicate: boolean };

    expect(res.status).toBe(200);
    expect(body.duplicate).toBe(true);
  });

  it("processes initial paid webhook as fallback and schedules renewal", async () => {
    mockWebhookVerify.mockResolvedValue({
      type: "Transaction.Paid",
      data: { paymentId: "pay_2" }
    });
    mockPaymentGet.mockResolvedValue({
      status: "PAID",
      amount: { total: 2900 },
      currency: "KRW",
      customData: JSON.stringify({ userId: 10, cycle: "monthly", source: "initial" }),
      billingKey: "bk_live"
    });
    mockUserFindUnique.mockResolvedValue({
      id: 10,
      email: "u@test.com",
      proUntil: null,
      stripeSubscriptionStatus: "active"
    });
    mockApplyPaidEntitlementOnce.mockResolvedValue({ applied: true });
    mockCreatePaymentSchedule.mockResolvedValue({ schedule: { id: "sch_next" } });
    const { POST } = await import("./route");

    const res = await POST(
      makeReq({
        "webhook-id": "wh_2",
        "webhook-signature": "sig",
        "webhook-timestamp": "1"
      })
    );
    const body = (await res.json()) as { ok: boolean; status: string };

    expect(res.status).toBe(200);
    expect(body.status).toBe("processed_fallback");
    expect(mockCreatePaymentSchedule).toHaveBeenCalledTimes(1);
    expect(mockUserUpdate).toHaveBeenCalled();
  });

  it("marks initial paid webhook already processed when entitlement is duplicate", async () => {
    mockWebhookVerify.mockResolvedValue({
      type: "Transaction.Paid",
      data: { paymentId: "pay_3" }
    });
    mockPaymentGet.mockResolvedValue({
      status: "PAID",
      amount: { total: 2900 },
      currency: "KRW",
      customData: JSON.stringify({ userId: 10, cycle: "monthly", source: "initial" }),
      billingKey: "bk_live"
    });
    mockUserFindUnique.mockResolvedValue({
      id: 10,
      email: "u@test.com",
      proUntil: null,
      stripeSubscriptionStatus: "active"
    });
    mockApplyPaidEntitlementOnce.mockResolvedValue({ applied: false });
    const { POST } = await import("./route");

    const res = await POST(
      makeReq({
        "webhook-id": "wh_3",
        "webhook-signature": "sig",
        "webhook-timestamp": "1"
      })
    );
    const body = (await res.json()) as { ok: boolean; status: string };

    expect(res.status).toBe(200);
    expect(body.status).toBe("already_processed");
    expect(mockCreatePaymentSchedule).not.toHaveBeenCalled();
  });
});
