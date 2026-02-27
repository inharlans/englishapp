import { NextRequest } from "next/server";

import { assertInternalCronRequest } from "@/lib/internalCronSecurity";
import type { InternalCronServiceResult } from "@/server/domain/internal/contracts";

import { returnWithMetric } from "@/lib/api/metric-response";
import { serviceResultToJson } from "@/lib/api/service-response";

export async function runInternalCronRoute(
  req: NextRequest,
  input: {
    route: string;
    run: (authorizationHeader: string | null) => Promise<InternalCronServiceResult>;
  }
) {
  const startedAt = Date.now();
  const denied = assertInternalCronRequest(req);
  if (denied) {
    return returnWithMetric({
      response: denied,
      route: input.route,
      method: "POST",
      startedAt
    });
  }

  const result = await input.run(req.headers.get("authorization"));
  return returnWithMetric({
    response: serviceResultToJson(result),
    route: input.route,
    method: "POST",
    startedAt
  });
}
