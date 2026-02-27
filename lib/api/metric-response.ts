import { NextResponse } from "next/server";

import { recordApiMetric } from "@/lib/observability";

export async function jsonWithMetric(params: {
  route: string;
  method: string;
  status: number;
  startedAt: number;
  body: unknown;
  headers?: Record<string, string>;
  userId?: number;
}) {
  const res = NextResponse.json(params.body, {
    status: params.status,
    headers: params.headers
  });
  await recordApiMetric({
    route: params.route,
    method: params.method,
    status: params.status,
    latencyMs: Date.now() - params.startedAt,
    userId: params.userId
  });
  return res;
}
