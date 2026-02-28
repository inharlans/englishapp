import { NextRequest } from "next/server";

import { returnWithMetric } from "@/lib/api/metric-response";
import { serviceResultToJson } from "@/lib/api/service-response";
import { assertInternalCronRequest } from "@/lib/internalCronSecurity";
import { InternalService } from "@/server/domain/internal/service";

const internalService = new InternalService();

function parseWindow(value: string | null): "1h" | "24h" | "7d" | null {
  if (value === null || value === "") return "24h";
  if (value === "1h" || value === "24h" || value === "7d") return value;
  return null;
}

function parseBoolean(value: string | null, defaultValue: boolean): boolean {
  if (value === null) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return defaultValue;
}

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const denied = assertInternalCronRequest(req);
  if (denied) {
    return returnWithMetric({
      response: denied,
      route: "/api/internal/ops/clipper-metrics",
      method: "GET",
      startedAt
    });
  }

  const window = parseWindow(req.nextUrl.searchParams.get("window"));
  if (!window) {
    return returnWithMetric({
      response: serviceResultToJson({ ok: false, status: 400, error: "Invalid window." }),
      route: "/api/internal/ops/clipper-metrics",
      method: "GET",
      startedAt
    });
  }
  const includeSeries = parseBoolean(req.nextUrl.searchParams.get("includeSeries"), true);
  const refresh = parseBoolean(req.nextUrl.searchParams.get("refresh"), false);

  const result = await internalService.getClipperMetrics({
    authorizationHeader: req.headers.get("authorization"),
    window,
    includeSeries,
    refresh
  });

  return returnWithMetric({
    response: serviceResultToJson(result),
    route: "/api/internal/ops/clipper-metrics",
    method: "GET",
    startedAt
  });
}
