import { NextRequest } from "next/server";

import { runInternalCronRoute } from "@/lib/api/internal-cron-route";
import { InternalService } from "@/server/domain/internal/service";

const internalService = new InternalService();

export async function POST(req: NextRequest) {
  return runInternalCronRoute(req, {
    route: "/api/internal/cron/clipper-enrichment",
    run: (authorizationHeader) => internalService.runClipperEnrichmentCron(authorizationHeader)
  });
}
