import { NextRequest, NextResponse } from "next/server";

import { assertTrustedMutationRequest } from "@/lib/requestSecurity";

import { requireUserFromRequest, type RequestUser } from "@/lib/api/route-helpers";
import { returnWithMetric } from "@/lib/api/metric-response";

export async function requireTrustedUserMutation(
  req: NextRequest,
  meta: { route: string; method: string; startedAt: number }
): Promise<{ ok: true; user: RequestUser } | { ok: false; response: NextResponse }> {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) {
    return {
      ok: false,
      response: await returnWithMetric({
        response: badReq,
        route: meta.route,
        method: meta.method,
        startedAt: meta.startedAt
      })
    };
  }

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) {
    return {
      ok: false,
      response: await returnWithMetric({
        response: auth.response,
        route: meta.route,
        method: meta.method,
        startedAt: meta.startedAt
      })
    };
  }

  return { ok: true, user: auth.user };
}
