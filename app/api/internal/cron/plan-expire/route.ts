import { NextRequest, NextResponse } from "next/server";

import { assertInternalCronRequest } from "@/lib/internalCronSecurity";
import { recordApiMetricFromStart } from "@/lib/observability";
import { InternalService } from "@/server/domain/internal/service";

const internalService = new InternalService();

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const denied = assertInternalCronRequest(req);
  if (denied) {
    await recordApiMetricFromStart({
      route: "/api/internal/cron/plan-expire",
      method: "POST",
      status: denied.status,
      startedAt
    });
    return denied;
  }

  const result = await internalService.runPlanExpireCron(req.headers.get("authorization"));
  await recordApiMetricFromStart({
    route: "/api/internal/cron/plan-expire",
    method: "POST",
    status: result.status,
    startedAt
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.payload, { status: result.status });
}
