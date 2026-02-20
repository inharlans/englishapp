import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { captureAppError, recordApiMetricFromStart } from "@/lib/observability";
import { getPortOneConfig, getPortOnePaymentClient } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { getPublicOrigin } from "@/lib/publicOrigin";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) {
    await recordApiMetricFromStart({
      route: "/api/payments/portal",
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
      route: "/api/payments/portal",
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
      route: "/api/payments/portal",
      method: "POST",
      status: 503,
      startedAt,
      userId: user.id
    });
    return res;
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { stripeCustomerId: true, stripeSubscriptionStatus: true }
    });
    const billingKey = dbUser?.stripeCustomerId ?? "";
    if (!billingKey) {
      const res = NextResponse.json({ error: "연결된 구독 결제 수단이 없습니다." }, { status: 400 });
      await recordApiMetricFromStart({
        route: "/api/payments/portal",
        method: "POST",
        status: 400,
        startedAt,
        userId: user.id
      });
      return res;
    }

    if (dbUser?.stripeSubscriptionStatus !== "canceled") {
      try {
        await paymentClient.paymentSchedule.revokePaymentSchedules({
          storeId: config.storeId,
          billingKey
        });
      } catch (error) {
        await captureAppError({
          route: "/api/payments/portal",
          message: "portone_revoke_schedule_failed",
          stack: error instanceof Error ? error.stack : undefined,
          context: { err: error instanceof Error ? error.message : String(error) },
          userId: user.id
        });
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeSubscriptionStatus: "canceled",
        stripeSubscriptionId: null
      }
    });

    const url = `${getPublicOrigin(req)}/pricing?payment=cancel`;
    const res = NextResponse.json({ url }, { status: 200 });
    await recordApiMetricFromStart({
      route: "/api/payments/portal",
      method: "POST",
      status: 200,
      startedAt,
      userId: user.id
    });
    return res;
  } catch (error) {
    await captureAppError({
      route: "/api/payments/portal",
      message: "payment_portal_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: { err: error instanceof Error ? error.message : String(error) },
      userId: user.id
    });
    await recordApiMetricFromStart({
      route: "/api/payments/portal",
      method: "POST",
      status: 500,
      startedAt,
      userId: user.id
    });
    return NextResponse.json({ error: "구독 관리 처리에 실패했습니다." }, { status: 500 });
  }
}
