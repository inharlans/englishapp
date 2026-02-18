import { NextRequest, NextResponse } from "next/server";

import { captureAppError, recordApiMetricFromStart } from "@/lib/observability";
import { addDays, BillingCycle, getCycleDays, getPlanAmountKrw, getPortOneConfig, getPortOnePaymentClient, normalizeCycle } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { Webhook } from "@portone/server-sdk";

type CustomData = {
  userId?: number;
  cycle?: string;
  source?: string;
};

function safeParseCustomData(raw: string | undefined): CustomData {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as CustomData;
  } catch {
    return {};
  }
}

function buildSchedulePaymentId(userId: number, cycle: BillingCycle): string {
  return `renew_${userId}_${cycle}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

async function scheduleNextBilling(input: {
  userId: number;
  userEmail: string;
  billingKey: string;
  cycle: BillingCycle;
  baseDate: Date;
}) {
  const paymentClient = getPortOnePaymentClient();
  const config = getPortOneConfig();
  if (!paymentClient || !config) return { scheduleId: null as string | null };

  const nextPayAt = addDays(input.baseDate, getCycleDays(input.cycle));
  const amount = getPlanAmountKrw(input.cycle);
  const paymentId = buildSchedulePaymentId(input.userId, input.cycle);

  const schedule = await paymentClient.paymentSchedule.createPaymentSchedule({
    paymentId,
    timeToPay: nextPayAt.toISOString(),
    payment: {
      storeId: config.storeId,
      billingKey: input.billingKey,
      channelKey: config.channelKey,
      orderName: input.cycle === "monthly" ? "Oing PRO Monthly Renewal" : "Oing PRO Yearly Renewal",
      customer: { id: String(input.userId), email: input.userEmail },
      customData: JSON.stringify({ userId: input.userId, cycle: input.cycle, source: "schedule" }),
      amount: { total: amount },
      currency: "KRW"
    }
  });
  return { scheduleId: schedule.schedule.id };
}

async function resolveUserId(paymentId: string, billingKey: string | undefined, customData: CustomData) {
  if (Number.isFinite(customData.userId) && (customData.userId ?? 0) > 0) {
    return Math.floor(customData.userId as number);
  }
  if (billingKey) {
    const u = await prisma.user.findFirst({
      where: { stripeCustomerId: billingKey },
      select: { id: true }
    });
    if (u) return u.id;
  }
  const byEvent = await prisma.paymentEvent.findFirst({
    where: {
      provider: "portone",
      providerEventId: `portone-confirm:${paymentId}`
    },
    select: { userId: true }
  });
  return byEvent?.userId ?? null;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const config = getPortOneConfig();
  const paymentClient = getPortOnePaymentClient();
  if (!config || !paymentClient) {
    const res = NextResponse.json({ error: "PortOne webhook not configured." }, { status: 503 });
    await recordApiMetricFromStart({
      route: "/api/payments/webhook",
      method: "POST",
      status: 503,
      startedAt
    });
    return res;
  }

  const payload = await req.text();
  const headers = {
    "webhook-id": req.headers.get("webhook-id") ?? "",
    "webhook-signature": req.headers.get("webhook-signature") ?? "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") ?? ""
  };
  if (!headers["webhook-id"] || !headers["webhook-signature"] || !headers["webhook-timestamp"]) {
    const res = NextResponse.json({ error: "Missing webhook headers." }, { status: 400 });
    await recordApiMetricFromStart({
      route: "/api/payments/webhook",
      method: "POST",
      status: 400,
      startedAt
    });
    return res;
  }

  let webhook: Awaited<ReturnType<typeof Webhook.verify>>;
  try {
    webhook = await Webhook.verify(config.webhookSecret, payload, headers);
  } catch (error) {
    await captureAppError({
      route: "/api/payments/webhook",
      message: "portone_webhook_verify_failed",
      context: { err: error instanceof Error ? error.message : String(error) }
    });
    const res = NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
    await recordApiMetricFromStart({
      route: "/api/payments/webhook",
      method: "POST",
      status: 400,
      startedAt
    });
    return res;
  }

  const providerEventId = `portone-webhook:${headers["webhook-id"]}`;
  const duplicate = await prisma.paymentEvent.findUnique({
    where: { providerEventId },
    select: { id: true }
  });
  if (duplicate) {
    const res = NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    await recordApiMetricFromStart({
      route: "/api/payments/webhook",
      method: "POST",
      status: 200,
      startedAt
    });
    return res;
  }

  let userId: number | null = null;
  let amount: number | null = null;
  let currency: string | null = null;
  let status = "ignored";

  try {
    if (webhook.type === "Transaction.Paid" || webhook.type === "Transaction.Failed" || webhook.type === "Transaction.Cancelled") {
      const paymentId = webhook.data.paymentId;
      const payment = await paymentClient.getPayment({
        paymentId,
        storeId: config.storeId
      });
      if (!("amount" in payment) || !("currency" in payment) || !("customData" in payment)) {
        throw new Error("Unrecognized payment payload.");
      }

      amount = payment.amount.total ?? null;
      currency = typeof payment.currency === "string" ? payment.currency : null;
      const customData = safeParseCustomData(payment.customData);
      const cycle = normalizeCycle(customData.cycle);
      userId = await resolveUserId(paymentId, payment.billingKey, customData);

      if (webhook.type === "Transaction.Paid" && payment.status === "PAID" && userId && cycle && payment.billingKey) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, proUntil: true, stripeSubscriptionStatus: true }
        });
        if (user) {
          const now = new Date();
          const baseDate = user.proUntil && user.proUntil.getTime() > now.getTime() ? user.proUntil : now;
          const nextProUntil = addDays(baseDate, getCycleDays(cycle));

          let nextScheduleId: string | null = null;
          if (user.stripeSubscriptionStatus !== "canceled") {
            try {
              const scheduled = await scheduleNextBilling({
                userId: user.id,
                userEmail: user.email,
                billingKey: payment.billingKey,
                cycle,
                baseDate: nextProUntil
              });
              nextScheduleId = scheduled.scheduleId;
            } catch (error) {
              await captureAppError({
                route: "/api/payments/webhook",
                message: "portone_schedule_renewal_failed",
                stack: error instanceof Error ? error.stack : undefined,
                context: { err: error instanceof Error ? error.message : String(error), paymentId },
                userId: user.id
              });
            }
          }

          await prisma.user.update({
            where: { id: user.id },
            data: {
              plan: "PRO",
              proUntil: nextProUntil,
              stripeCustomerId: payment.billingKey,
              stripeSubscriptionStatus: user.stripeSubscriptionStatus === "canceled" ? "canceled" : "active",
              ...(nextScheduleId ? { stripeSubscriptionId: nextScheduleId } : {})
            }
          });
          status = "processed";
        }
      } else if (webhook.type === "Transaction.Failed") {
        status = "failed";
      } else if (webhook.type === "Transaction.Cancelled") {
        status = "cancelled";
      }
    }

    await prisma.paymentEvent.create({
      data: {
        userId,
        provider: "portone",
        providerEventId,
        eventType: String(webhook.type),
        status,
        amount,
        currency,
        rawJson: webhook as unknown as object
      }
    });

    const res = NextResponse.json({ ok: true, status }, { status: 200 });
    await recordApiMetricFromStart({
      route: "/api/payments/webhook",
      method: "POST",
      status: 200,
      startedAt,
      userId
    });
    return res;
  } catch (error) {
    await captureAppError({
      route: "/api/payments/webhook",
      message: "portone_webhook_processing_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: { err: error instanceof Error ? error.message : String(error), eventId: providerEventId },
      userId
    });
    try {
      await prisma.paymentEvent.create({
        data: {
          userId,
          provider: "portone",
          providerEventId,
          eventType: "unknown",
          status: "error",
          amount,
          currency,
          rawJson: {
            payload,
            error: error instanceof Error ? error.message : String(error)
          } as object
        }
      });
    } catch {
      // Best effort only.
    }
    await recordApiMetricFromStart({
      route: "/api/payments/webhook",
      method: "POST",
      status: 500,
      startedAt,
      userId
    });
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
