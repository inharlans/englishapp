import { prisma } from "@/lib/prisma";
import { logJson } from "@/lib/logger";
import { maskSensitiveText, maskSensitiveUnknown } from "@/lib/textQuality";

export async function recordApiMetric(input: {
  route: string;
  method: string;
  status: number;
  latencyMs: number;
  userId?: number | null;
}) {
  try {
    await prisma.apiRequestMetric.create({
      data: {
        route: input.route,
        method: input.method.toUpperCase(),
        status: input.status,
        latencyMs: Math.max(0, Math.floor(input.latencyMs)),
        userId: input.userId ?? null
      }
    });
  } catch (error) {
    logJson("warn", "record_api_metric_failed", {
      route: input.route,
      method: input.method,
      status: input.status,
      err: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function captureAppError(input: {
  level?: "error" | "warn";
  route?: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  userId?: number | null;
}) {
  const level = input.level ?? "error";
  const maskedMessage = maskSensitiveText(input.message);
  const maskedContext = input.context ? (maskSensitiveUnknown(input.context) as Record<string, unknown>) : undefined;
  const maskedStack = input.stack ? maskSensitiveText(input.stack) : undefined;
  logJson(level, maskedMessage, {
    route: input.route,
    userId: input.userId ?? null,
    ...(maskedContext ?? {})
  });

  try {
    await prisma.appErrorEvent.create({
      data: {
        level,
        route: input.route ?? null,
        message: maskedMessage,
        stack: maskedStack ?? null,
        context: maskedContext ? (maskedContext as object) : undefined,
        userId: input.userId ?? null
      }
    });
  } catch (error) {
    logJson("warn", "capture_app_error_failed", {
      route: input.route,
      err: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function recordApiMetricFromStart(input: {
  route: string;
  method: string;
  startedAt: number;
  status: number;
  userId?: number | null;
}) {
  await recordApiMetric({
    route: input.route,
    method: input.method,
    status: input.status,
    latencyMs: Date.now() - input.startedAt,
    userId: input.userId ?? null
  });
}
