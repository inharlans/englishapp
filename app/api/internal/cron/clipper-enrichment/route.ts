import { NextRequest } from "next/server";

import { returnWithMetric } from "@/lib/api/metric-response";
import { assertInternalCronRequest } from "@/lib/internalCronSecurity";
import { serviceResultToJson } from "@/lib/api/service-response";
import { InternalService } from "@/server/domain/internal/service";

const internalService = new InternalService();

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const denied = assertInternalCronRequest(req);
  if (denied) {
    return returnWithMetric({
      response: denied,
      route: "/api/internal/cron/clipper-enrichment",
      method: "POST",
      startedAt
    });
  }

  const result = await internalService.runClipperEnrichmentCron(req.headers.get("authorization"));
  return returnWithMetric({
    response: serviceResultToJson(result),
    route: "/api/internal/cron/clipper-enrichment",
    method: "POST",
    startedAt
  });
}
