import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { captureAppError, recordApiMetricFromStart } from "@/lib/observability";
import { getStripe } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
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

  try {
    const stripe = getStripe();
    if (!stripe) {
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

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { stripeCustomerId: true }
    });
    if (!dbUser?.stripeCustomerId) {
      const res = NextResponse.json({ error: "연결된 결제 고객 정보가 없습니다." }, { status: 400 });
      await recordApiMetricFromStart({
        route: "/api/payments/portal",
        method: "POST",
        status: 400,
        startedAt,
        userId: user.id
      });
      return res;
    }

    const returnUrl = process.env.STRIPE_PORTAL_RETURN_URL?.trim() || `${req.nextUrl.origin}/pricing`;
    const session = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripeCustomerId,
      return_url: returnUrl
    });
    const res = NextResponse.json({ url: session.url }, { status: 200 });
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
    return NextResponse.json({ error: "결제 포털 세션 생성에 실패했습니다." }, { status: 500 });
  }
}
