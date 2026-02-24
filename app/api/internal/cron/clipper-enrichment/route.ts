import { NextRequest, NextResponse } from "next/server";

import { recordApiMetricFromStart } from "@/lib/observability";
import { InternalService } from "@/server/domain/internal/service";

const internalService = new InternalService();

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const result = await internalService.runClipperEnrichmentCron(req.headers.get("authorization"));
  await recordApiMetricFromStart({
    route: "/api/internal/cron/clipper-enrichment",
    method: "POST",
    status: result.status,
    startedAt
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.payload, { status: result.status });
}

