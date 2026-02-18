import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { captureAppError, recordApiMetricFromStart } from "@/lib/observability";
import {
  BillingCycle,
  getPlanAmountKrw,
  getPortOneConfig,
  getPortOnePaymentClient,
  normalizeCycle
} from "@/lib/payments";
import {
  applyPaidEntitlementOnce,
  computeNextProUntil,
  computeNextScheduleAt
} from "@/lib/paymentsEntitlement";
import { prisma } from "@/lib/prisma";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { z } from "zod";

const confirmSchema = z.object({
  billingKey: z.string().min(1),
  cycle: z.enum(["monthly", "yearly"])
});

function buildPaymentId(userId: number, cycle: BillingCycle): string {
  return `pay_${userId}_${cycle}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

function buildSchedulePaymentId(userId: number, cycle: BillingCycle): string {
  return `renew_${userId}_${cycle}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

async function scheduleNextBilling(input: {
  userId: number;
  userEmail: string;
  billingKey: string;
  cycle: BillingCycle;
  nextProUntil: Date;
}) {
  const paymentClient = getPortOnePaymentClient();
  const config = getPortOneConfig();
  if (!paymentClient || !config) return { scheduleId: null as string | null };

  const nextPayAt = computeNextScheduleAt(input.nextProUntil);
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

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) {
    await recordApiMetricFromStart({
      route: "/api/payments/confirm",
      method: "POST",
      status: badReq.status,
      startedAt
    });
    return badReq;
  }

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    const res = NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    await recordApiMetricFromStart({
      route: "/api/payments/confirm",
      method: "POST",
      status: 401,
      startedAt
    });
    return res;
  }

  const paymentClient = getPortOnePaymentClient();
  const config = getPortOneConfig();
  if (!paymentClient || !config) {
    const res = NextResponse.json({ error: "결제 설정이 아직 완료되지 않았습니다." }, { status: 503 });
    await recordApiMetricFromStart({
      route: "/api/payments/confirm",
      method: "POST",
      status: 503,
      startedAt,
      userId: user.id
    });
    return res;
  }

  try {
    const parsed = await parseJsonWithSchema(req, confirmSchema);
    if (!parsed.ok) {
      await recordApiMetricFromStart({
        route: "/api/payments/confirm",
        method: "POST",
        status: parsed.response.status,
        startedAt,
        userId: user.id
      });
      return parsed.response;
    }

    const cycle = normalizeCycle(parsed.data.cycle);
    if (!cycle) {
      const res = NextResponse.json({ error: "Invalid cycle." }, { status: 400 });
      await recordApiMetricFromStart({
        route: "/api/payments/confirm",
        method: "POST",
        status: 400,
        startedAt,
        userId: user.id
      });
      return res;
    }

    const paymentId = buildPaymentId(user.id, cycle);
    await paymentClient.payWithBillingKey({
      paymentId,
      storeId: config.storeId,
      billingKey: parsed.data.billingKey,
      channelKey: config.channelKey,
      orderName: cycle === "monthly" ? "Oing PRO Monthly" : "Oing PRO Yearly",
      customer: { id: String(user.id), email: user.email },
      customData: JSON.stringify({ userId: user.id, cycle, source: "initial" }),
      amount: { total: getPlanAmountKrw(cycle) },
      currency: "KRW"
    });

    const payment = await paymentClient.getPayment({
      paymentId,
      storeId: config.storeId
    });

    if (payment.status !== "PAID") {
      const res = NextResponse.json({ error: "결제가 아직 완료되지 않았습니다." }, { status: 409 });
      await recordApiMetricFromStart({
        route: "/api/payments/confirm",
        method: "POST",
        status: 409,
        startedAt,
        userId: user.id
      });
      return res;
    }

    const expectedAmount = getPlanAmountKrw(cycle);
    if ((payment.amount.total ?? 0) !== expectedAmount) {
      const res = NextResponse.json({ error: "결제 금액 검증에 실패했습니다." }, { status: 400 });
      await recordApiMetricFromStart({
        route: "/api/payments/confirm",
        method: "POST",
        status: 400,
        startedAt,
        userId: user.id
      });
      return res;
    }

    const billingKey = payment.billingKey || parsed.data.billingKey;
    const nextProUntil = computeNextProUntil({
      now: new Date(),
      currentProUntil: user.proUntil,
      cycle
    });

    const entitlement = await prisma.$transaction(async (tx) => {
      const result = await applyPaidEntitlementOnce(tx, {
        userId: user.id,
        paymentId,
        billingKey,
        nextProUntil,
        source: "confirm"
      });

      await tx.paymentEvent.create({
        data: {
          userId: user.id,
          provider: "portone",
          providerEventId: `portone-confirm:${paymentId}`,
          eventType: "confirm.paid",
          status: "processed",
          amount: payment.amount.total ?? null,
          currency: payment.currency ?? null,
          rawJson: {
            cycle,
            paymentId,
            billingKey,
            scheduleId: null
          }
        }
      });
      return result;
    });

    if (entitlement.applied) {
      try {
        const scheduled = await scheduleNextBilling({
          userId: user.id,
          userEmail: user.email,
          billingKey,
          cycle,
          nextProUntil
        });
        if (scheduled.scheduleId) {
          await prisma.user.update({
            where: { id: user.id },
            data: { stripeSubscriptionId: scheduled.scheduleId }
          });
        }
      } catch (error) {
        await captureAppError({
          route: "/api/payments/confirm",
          message: "portone_next_schedule_failed",
          stack: error instanceof Error ? error.stack : undefined,
          context: { err: error instanceof Error ? error.message : String(error), paymentId },
          userId: user.id
        });
      }
    }

    const res = NextResponse.json({ ok: true, applied: entitlement.applied }, { status: 200 });
    await recordApiMetricFromStart({
      route: "/api/payments/confirm",
      method: "POST",
      status: 200,
      startedAt,
      userId: user.id
    });
    return res;
  } catch (error) {
    await captureAppError({
      route: "/api/payments/confirm",
      message: "portone_confirm_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: { err: error instanceof Error ? error.message : String(error) },
      userId: user.id
    });
    await recordApiMetricFromStart({
      route: "/api/payments/confirm",
      method: "POST",
      status: 500,
      startedAt,
      userId: user.id
    });
    return NextResponse.json({ error: "결제 검증에 실패했습니다." }, { status: 500 });
  }
}
