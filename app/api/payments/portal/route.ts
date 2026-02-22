import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { captureAppError, recordApiMetricFromStart } from "@/lib/observability";
import { getPublicOrigin } from "@/lib/publicOrigin";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { PaymentsService } from "@/server/domain/payments/service";

const paymentsService = new PaymentsService();

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
    const result = await paymentsService.cancelSubscription(user, getPublicOrigin(req));
    const res = result.ok
      ? NextResponse.json(result.payload, { status: result.status })
      : NextResponse.json({ error: result.error }, { status: result.status });

    await recordApiMetricFromStart({
      route: "/api/payments/portal",
      method: "POST",
      status: result.status,
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
