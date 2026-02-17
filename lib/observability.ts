import { prisma } from "@/lib/prisma";
import { logJson } from "@/lib/logger";

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
  logJson(level, input.message, {
    route: input.route,
    userId: input.userId ?? null,
    ...(input.context ?? {})
  });

  try {
    await prisma.appErrorEvent.create({
      data: {
        level,
        route: input.route ?? null,
        message: input.message,
        stack: input.stack ?? null,
        context: input.context ? (input.context as object) : undefined,
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
