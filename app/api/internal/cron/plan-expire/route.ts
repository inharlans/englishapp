import { NextRequest, NextResponse } from "next/server";

import { captureAppError, recordApiMetricFromStart } from "@/lib/observability";
import { prisma } from "@/lib/prisma";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  if (!isAuthorized(req)) {
    const res = NextResponse.json({ error: "Forbidden." }, { status: 403 });
    await recordApiMetricFromStart({
      route: "/api/internal/cron/plan-expire",
      method: "POST",
      status: 403,
      startedAt
    });
    return res;
  }

  try {
    const now = new Date();
    const expiredUsers = await prisma.user.findMany({
      where: {
        plan: "PRO",
        proUntil: { not: null, lt: now }
      },
      select: { id: true }
    });

    const result = await prisma.user.updateMany({
      where: {
        id: { in: expiredUsers.map((u) => u.id) }
      },
      data: {
        plan: "FREE",
        stripeSubscriptionStatus: "expired"
      }
    });

    const res = NextResponse.json(
      {
        ok: true,
        expiredCount: result.count,
        ranAt: now.toISOString()
      },
      { status: 200 }
    );
    await recordApiMetricFromStart({
      route: "/api/internal/cron/plan-expire",
      method: "POST",
      status: 200,
      startedAt
    });
    return res;
  } catch (error) {
    await captureAppError({
      route: "/api/internal/cron/plan-expire",
      message: "cron_plan_expire_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: { err: error instanceof Error ? error.message : String(error) }
    });
    await recordApiMetricFromStart({
      route: "/api/internal/cron/plan-expire",
      method: "POST",
      status: 500,
      startedAt
    });
    return NextResponse.json({ error: "Plan expiration cron failed." }, { status: 500 });
  }
}
