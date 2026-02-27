import { NextRequest, NextResponse } from "next/server";

import { returnWithMetric } from "@/lib/api/metric-response";
import { requireTrustedUserMutation } from "@/lib/api/mutation-route";
import { captureAppError } from "@/lib/observability";
import { getPublicOrigin } from "@/lib/publicOrigin";
import { PaymentsService } from "@/server/domain/payments/service";

const paymentsService = new PaymentsService();

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const guard = await requireTrustedUserMutation(req, {
    route: "/api/payments/portal",
    method: "POST",
    startedAt
  });
  if (!guard.ok) return guard.response;
  const user = guard.user;

  try {
    const result = await paymentsService.cancelSubscription(user, getPublicOrigin(req));
    const res = result.ok
      ? NextResponse.json(result.payload, { status: result.status })
      : NextResponse.json({ error: result.error }, { status: result.status });

    return returnWithMetric({
      response: res,
      route: "/api/payments/portal",
      method: "POST",
      startedAt,
      userId: user.id
    });
  } catch (error) {
    await captureAppError({
      route: "/api/payments/portal",
      message: "payment_portal_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: { err: error instanceof Error ? error.message : String(error) },
      userId: user.id
    });
    return returnWithMetric({
      response: NextResponse.json({ error: "구독 관리 처리에 실패했습니다." }, { status: 500 }),
      route: "/api/payments/portal",
      method: "POST",
      startedAt,
      userId: user.id
    });
  }
}
