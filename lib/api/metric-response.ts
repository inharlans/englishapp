import { NextResponse } from "next/server";

import { recordApiMetric, recordApiMetricFromStart } from "@/lib/observability";

const METRIC_WRITE_TIMEOUT_MS = 60;

async function waitForMetricWrite(task: Promise<unknown>): Promise<void> {
  try {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise((resolve) => {
      timeoutHandle = setTimeout(resolve, METRIC_WRITE_TIMEOUT_MS);
      timeoutHandle.unref?.();
    });
    await Promise.race([
      task,
      timeoutPromise
    ]);
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  } catch {
  }
}

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
  await waitForMetricWrite(
    recordApiMetric({
      route: params.route,
      method: params.method,
      status: params.status,
      latencyMs: Date.now() - params.startedAt,
      userId: params.userId
    })
  );
  return res;
}

export async function returnWithMetric(params: {
  response: NextResponse;
  route: string;
  method: string;
  startedAt: number;
  userId?: number;
}) {
  await waitForMetricWrite(
    recordApiMetricFromStart({
      route: params.route,
      method: params.method,
      status: params.response.status,
      startedAt: params.startedAt,
      userId: params.userId
    })
  );
  return params.response;
}
