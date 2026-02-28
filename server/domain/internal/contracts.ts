export interface InternalCronResult {
  ok: true;
  status: 200;
  payload: Record<string, unknown>;
}

export interface InternalMetricsResult {
  ok: true;
  status: 200;
  payload: {
    ok: true;
    window: "1h" | "24h" | "7d";
    generatedAt: string;
    cache: {
      mode: "no-cache" | "ttl-5m";
      hit: boolean;
      ttlSec: number;
    };
    queue: {
      queued: number;
      processing: number;
      waitMs: { p50: number; p95: number };
      processMs: { p50: number; p95: number };
      throughputPerHour: number;
    };
    quality: {
      doneCount: number;
      failedCount: number;
      successRate: number;
      failureRate: number;
      retryRate: number;
      retrySuccessRate: number;
      terminalFailed: number;
      partialDoneRate: number;
    };
    failureReasons: Array<{ code: string; count: number }>;
    topFailures: Array<{ code: string; count: number }>;
    topFailuresOthersCount: number;
    alerts: Array<{
      level: "warn" | "critical";
      key: string;
      message: string;
      value: number;
      warn: number;
      critical: number;
      window: string;
    }>;
    cost: {
      cronCallCount: number;
      charEstimate: number;
      tokenEstimate: number;
    };
    trend: {
      metric: "failedCount";
      curr: number;
      prev: number;
      delta: number;
      pct: number | null;
    };
    policy: {
      version: string;
    };
    ux: {
      doneLatencyMs: { p95: number };
    };
    series: {
      hourly: Array<{ hour: string; doneCount: number; failedCount: number }>;
    };
  };
}

export type InternalCronServiceResult =
  | InternalCronResult
  | {
      ok: false;
      status: 403 | 500;
      error: string;
    };

export type InternalMetricsServiceResult =
  | InternalMetricsResult
  | {
      ok: false;
      status: 400 | 403 | 500;
      error: string;
    };
