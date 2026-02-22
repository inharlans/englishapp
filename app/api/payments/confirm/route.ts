import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { captureAppError, recordApiMetricFromStart } from "@/lib/observability";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
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

    const result = await paymentsService.confirm(user, {
      billingKey: parsed.data.billingKey,
      cycle: parsed.data.cycle
    });

    const res = result.ok
      ? NextResponse.json(result.payload, { status: result.status })
      : NextResponse.json({ error: result.error }, { status: result.status });

    await recordApiMetricFromStart({
      route: "/api/payments/confirm",
      method: "POST",
      status: result.status,
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
