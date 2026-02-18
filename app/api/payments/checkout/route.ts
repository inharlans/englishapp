import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { captureAppError, recordApiMetricFromStart } from "@/lib/observability";
import { BillingCycle, getPortOneConfig, normalizeCycle } from "@/lib/payments";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { z } from "zod";

const checkoutSchema = z.object({
  cycle: z.enum(["monthly", "yearly"])
});

function buildIssueId(userId: number, cycle: BillingCycle): string {
  return `issue_${userId}_${cycle}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) {
    await recordApiMetricFromStart({
      route: "/api/payments/checkout",
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
      route: "/api/payments/checkout",
      method: "POST",
      status: 401,
      startedAt
    });
    return res;
  }

  try {
    const config = getPortOneConfig();
    if (!config) {
      const res = NextResponse.json({ error: "결제 설정이 아직 완료되지 않았습니다." }, { status: 503 });
      await recordApiMetricFromStart({
        route: "/api/payments/checkout",
        method: "POST",
        status: 503,
        startedAt,
        userId: user.id
      });
      return res;
    }

    const parsed = await parseJsonWithSchema(req, checkoutSchema);
    if (!parsed.ok) {
      await recordApiMetricFromStart({
        route: "/api/payments/checkout",
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
        route: "/api/payments/checkout",
        method: "POST",
        status: 400,
        startedAt,
        userId: user.id
      });
      return res;
    }

    const issueId = buildIssueId(user.id, cycle);

    const res = NextResponse.json(
      {
        request: {
          storeId: config.storeId,
          channelKey: config.channelKey,
          billingKeyMethod: "CARD",
          issueId,
          issueName: cycle === "monthly" ? "Oing PRO Monthly Billing Key" : "Oing PRO Yearly Billing Key",
          redirectUrl: `${req.nextUrl.origin}/pricing`,
          customer: {
            customerId: String(user.id),
            email: user.email,
            fullName: user.email
          },
          customData: {
            userId: user.id,
            cycle
          }
        },
        cycle
      },
      { status: 200 }
    );
    await recordApiMetricFromStart({
      route: "/api/payments/checkout",
      method: "POST",
      status: 200,
      startedAt,
      userId: user.id
    });
    return res;
  } catch (error) {
    await captureAppError({
      level: "error",
      route: "/api/payments/checkout",
      message: "payment_checkout_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: { err: error instanceof Error ? error.message : String(error) },
      userId: user.id
    });
    await recordApiMetricFromStart({
      route: "/api/payments/checkout",
      method: "POST",
      status: 500,
      startedAt,
      userId: user.id
    });
    return NextResponse.json({ error: "결제 요청 생성에 실패했습니다." }, { status: 500 });
  }
}
