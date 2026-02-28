import type { InternalMetricsResult } from "@/server/domain/internal/contracts";

export const CLIPPER_ALERT_WINDOWS = {
  BACKLOG: "10m",
  WAIT_P95: "15m",
  PROCESS_P95: "15m",
  SUCCESS_RATE: "30m",
  RATE_LIMIT: "15m",
  TERMINAL_FAILED: "1h",
  UX_DONE_P95: "30m"
} as const;

export const CLIPPER_ALERT_POLICY_VERSION = "2026-03-01.v1";

export const CLIPPER_ALERT_THRESHOLDS = {
  queuedBacklog: { warn: 500, critical: 2000, window: CLIPPER_ALERT_WINDOWS.BACKLOG },
  waitP95Ms: { warn: 180_000, critical: 600_000, window: CLIPPER_ALERT_WINDOWS.WAIT_P95 },
  processP95Ms: { warn: 30_000, critical: 90_000, window: CLIPPER_ALERT_WINDOWS.PROCESS_P95 },
  successRate: { warn: 0.97, critical: 0.9, window: CLIPPER_ALERT_WINDOWS.SUCCESS_RATE },
  rateLimitRatio: { warn: 0.05, critical: 0.15, window: CLIPPER_ALERT_WINDOWS.RATE_LIMIT },
  terminalFailed: { warn: 20, critical: 100, window: CLIPPER_ALERT_WINDOWS.TERMINAL_FAILED },
  uxDoneP95Ms: { warn: 300_000, critical: 900_000, window: CLIPPER_ALERT_WINDOWS.UX_DONE_P95 }
} as const;

type AlertLevel = "warn" | "critical";

function pushAboveThresholdAlert(input: {
  alerts: InternalMetricsResult["payload"]["alerts"];
  key: string;
  label: string;
  value: number;
  warn: number;
  critical: number;
  window: string;
}) {
  if (input.value >= input.critical) {
    input.alerts.push({
      level: "critical",
      key: input.key,
      message: `${input.label}이(가) 임계치를 초과했습니다.`,
      value: input.value,
      warn: input.warn,
      critical: input.critical,
      window: input.window
    });
    return;
  }
  if (input.value >= input.warn) {
    input.alerts.push({
      level: "warn",
      key: input.key,
      message: `${input.label}이(가) 경고 임계치에 도달했습니다.`,
      value: input.value,
      warn: input.warn,
      critical: input.critical,
      window: input.window
    });
  }
}

function pushBelowThresholdAlert(input: {
  alerts: InternalMetricsResult["payload"]["alerts"];
  key: string;
  label: string;
  value: number;
  warn: number;
  critical: number;
  window: string;
}) {
  if (input.value <= input.critical) {
    input.alerts.push({
      level: "critical",
      key: input.key,
      message: `${input.label}이(가) 임계치 이하로 내려갔습니다.`,
      value: input.value,
      warn: input.warn,
      critical: input.critical,
      window: input.window
    });
    return;
  }
  if (input.value <= input.warn) {
    input.alerts.push({
      level: "warn",
      key: input.key,
      message: `${input.label}이(가) 경고 임계치 이하입니다.`,
      value: input.value,
      warn: input.warn,
      critical: input.critical,
      window: input.window
    });
  }
}

export function evaluateClipperAlerts(input: {
  queue: InternalMetricsResult["payload"]["queue"];
  quality: InternalMetricsResult["payload"]["quality"];
  rateLimitFailed: number;
  ux: InternalMetricsResult["payload"]["ux"];
}): InternalMetricsResult["payload"]["alerts"] {
  const alerts: InternalMetricsResult["payload"]["alerts"] = [];

  pushAboveThresholdAlert({
    alerts,
    key: "queued_backlog",
    label: "QUEUED backlog",
    value: input.queue.queued,
    warn: CLIPPER_ALERT_THRESHOLDS.queuedBacklog.warn,
    critical: CLIPPER_ALERT_THRESHOLDS.queuedBacklog.critical,
    window: CLIPPER_ALERT_THRESHOLDS.queuedBacklog.window
  });

  pushAboveThresholdAlert({
    alerts,
    key: "wait_p95_ms",
    label: "대기시간 P95",
    value: input.queue.waitMs.p95,
    warn: CLIPPER_ALERT_THRESHOLDS.waitP95Ms.warn,
    critical: CLIPPER_ALERT_THRESHOLDS.waitP95Ms.critical,
    window: CLIPPER_ALERT_THRESHOLDS.waitP95Ms.window
  });

  pushAboveThresholdAlert({
    alerts,
    key: "process_p95_ms",
    label: "처리시간 P95",
    value: input.queue.processMs.p95,
    warn: CLIPPER_ALERT_THRESHOLDS.processP95Ms.warn,
    critical: CLIPPER_ALERT_THRESHOLDS.processP95Ms.critical,
    window: CLIPPER_ALERT_THRESHOLDS.processP95Ms.window
  });

  pushBelowThresholdAlert({
    alerts,
    key: "success_rate",
    label: "성공률",
    value: input.quality.successRate,
    warn: CLIPPER_ALERT_THRESHOLDS.successRate.warn,
    critical: CLIPPER_ALERT_THRESHOLDS.successRate.critical,
    window: CLIPPER_ALERT_THRESHOLDS.successRate.window
  });

  const failedTotal = Math.max(1, input.quality.failedCount);
  const rateLimitFailures = input.rateLimitFailed;
  const rateLimitRatio = rateLimitFailures / failedTotal;
  pushAboveThresholdAlert({
    alerts,
    key: "rate_limit_ratio",
    label: "RATE_LIMIT 비율",
    value: rateLimitRatio,
    warn: CLIPPER_ALERT_THRESHOLDS.rateLimitRatio.warn,
    critical: CLIPPER_ALERT_THRESHOLDS.rateLimitRatio.critical,
    window: CLIPPER_ALERT_THRESHOLDS.rateLimitRatio.window
  });

  pushAboveThresholdAlert({
    alerts,
    key: "terminal_failed",
    label: "Terminal failed",
    value: input.quality.terminalFailed,
    warn: CLIPPER_ALERT_THRESHOLDS.terminalFailed.warn,
    critical: CLIPPER_ALERT_THRESHOLDS.terminalFailed.critical,
    window: CLIPPER_ALERT_THRESHOLDS.terminalFailed.window
  });

  pushAboveThresholdAlert({
    alerts,
    key: "ux_done_p95_ms",
    label: "사용자 완료 지연 P95",
    value: input.ux.doneLatencyMs.p95,
    warn: CLIPPER_ALERT_THRESHOLDS.uxDoneP95Ms.warn,
    critical: CLIPPER_ALERT_THRESHOLDS.uxDoneP95Ms.critical,
    window: CLIPPER_ALERT_THRESHOLDS.uxDoneP95Ms.window
  });

  const levelOrder: Record<AlertLevel, number> = { critical: 0, warn: 1 };
  alerts.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
  return alerts;
}
