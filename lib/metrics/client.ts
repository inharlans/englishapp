"use client";

import { type ClientMetricName } from "@/lib/metrics/names";

export function sendClientMetric(name: ClientMetricName, payload: Record<string, unknown>) {
  const body = JSON.stringify({ name, ts: Date.now(), payload });
  const url = "/api/internal/client-metrics";

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      const sent = navigator.sendBeacon(url, blob);
      if (sent) return;
    }
  } catch {
    // Fallback fetch below.
  }

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true
  }).catch(() => {
    // Silent by design: metrics must not break UX.
  });
}
