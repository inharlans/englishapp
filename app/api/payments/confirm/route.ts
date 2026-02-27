import { NextRequest, NextResponse } from "next/server";

import { returnWithMetric } from "@/lib/api/metric-response";
import { requireTrustedUserMutation } from "@/lib/api/mutation-route";
import { captureAppError } from "@/lib/observability";
import { parseJsonWithSchema } from "@/lib/validation";
import { PaymentsService } from "@/server/domain/payments/service";
import { z } from "zod";

const confirmSchema = z.object({
  billingKey: z.string().min(1),
  cycle: z.enum(["monthly", "yearly"])
});

const paymentsService = new PaymentsService();

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const guard = await requireTrustedUserMutation(req, {
    route: "/api/payments/confirm",
    method: "POST",
    startedAt
  });
  if (!guard.ok) return guard.response;
  const user = guard.user;

  try {
    const parsed = await parseJsonWithSchema(req, confirmSchema);
    if (!parsed.ok) {
      return returnWithMetric({
        response: parsed.response,
        route: "/api/payments/confirm",
        method: "POST",
        startedAt,
        userId: user.id
      });
    }

    const result = await paymentsService.confirm(user, {
      billingKey: parsed.data.billingKey,
      cycle: parsed.data.cycle
    });

    const res = result.ok
      ? NextResponse.json(result.payload, { status: result.status })
      : NextResponse.json({ error: result.error }, { status: result.status });

    return returnWithMetric({
      response: res,
      route: "/api/payments/confirm",
      method: "POST",
      startedAt,
      userId: user.id
    });
  } catch (error) {
    await captureAppError({
      route: "/api/payments/confirm",
      message: "portone_confirm_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: { err: error instanceof Error ? error.message : String(error) },
      userId: user.id
    });
    return returnWithMetric({
      response: NextResponse.json({ error: "결제 검증에 실패했습니다." }, { status: 500 }),
      route: "/api/payments/confirm",
      method: "POST",
      startedAt,
      userId: user.id
    });
  }
}
