import { apiFetch } from "@/lib/clientApi";

import { parseApiResponse } from "@/lib/api/base";

export type AdminUserRow = {
  id: number;
  email: string;
  isAdmin: boolean;
  plan: "FREE" | "PRO";
  proUntil: string | null;
  createdAt: string;
};

export type AdminReportRow = {
  id: number;
  reason: string;
  detail: string | null;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  reporterTrustScore: number;
  createdAt: string;
  reviewedAt: string | null;
  moderatorNote: string | null;
  reviewAction: string | null;
  qualityScore: number;
  previousStatus: "OPEN" | "RESOLVED" | "DISMISSED" | null;
  nextStatus: "OPEN" | "RESOLVED" | "DISMISSED" | null;
  reviewerIpHash: string | null;
  reporter: { id: number; email: string };
  reviewedBy: { id: number; email: string } | null;
  wordbook: {
    id: number;
    title: string;
    isPublic: boolean;
    hiddenByAdmin: boolean;
    owner: { id: number; email: string };
  };
};

export type AdminRouteMetricRow = {
  route: string;
  total: number;
  status4xx: number;
  status5xx: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
};

export type AdminErrorMetricRow = {
  id: number;
  level: string;
  route: string | null;
  message: string;
  createdAt: string;
};

export type AdminSloSummary = {
  apiSuccessRate: number;
  apiSuccessTarget: number;
  cronSuccessRate: number;
  cronSuccessTarget: number;
  coreP95LatencyMs: number;
  coreP95LatencyTargetMs: number;
  violations: string[];
};

export type AdminQuizQualitySummary = {
  wrongAnswers: number;
  disputableWrongCount: number;
  disputableWrongRate: number;
};

export type AdminClipperAlert = {
  level: "warn" | "critical";
  key: string;
  message: string;
  value: number;
  warn: number;
  critical: number;
  window: string;
};

export type AdminClipperMetrics = {
  ok: true;
  window: "1h" | "24h" | "7d";
  generatedAt: string;
  cache: { mode: "no-cache" | "ttl-5m"; hit: boolean; ttlSec: number };
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
  alerts: AdminClipperAlert[];
  cost: { cronCallCount: number; charEstimate: number; tokenEstimate: number };
  trend: { metric: "failedCount"; curr: number; prev: number; delta: number; pct: number | null };
  policy: { version: string };
  ux: { doneLatencyMs: { p95: number } };
  series: { hourly: Array<{ hour: string; doneCount: number; failedCount: number }> };
};

export async function getAdminUsers(): Promise<AdminUserRow[]> {
  const res = await apiFetch("/api/admin/users");
  const json = await parseApiResponse<{ users?: AdminUserRow[] }>(res, "Failed to load users.", "admin.users.list");
  return json.users ?? [];
}

export async function getAdminReports(): Promise<AdminReportRow[]> {
  const res = await apiFetch("/api/admin/reports");
  const json = await parseApiResponse<{ reports?: AdminReportRow[] }>(
    res,
    "Failed to load reports.",
    "admin.reports.list"
  );
  return (json.reports ?? []).map((r) => ({
    ...r,
    createdAt: new Date(r.createdAt).toISOString(),
    reviewedAt: r.reviewedAt ? new Date(r.reviewedAt).toISOString() : null
  }));
}

export async function getAdminMetrics(input?: {
  clipperWindow?: "1h" | "24h" | "7d";
  clipperRefresh?: boolean;
}): Promise<{
  routeStats: AdminRouteMetricRow[];
  recentErrors: AdminErrorMetricRow[];
  slo: AdminSloSummary | null;
  quizQuality: AdminQuizQualitySummary | null;
  clipper: AdminClipperMetrics | null;
}> {
  const params = new URLSearchParams();
  if (input?.clipperWindow) params.set("clipperWindow", input.clipperWindow);
  if (input?.clipperRefresh) params.set("clipperRefresh", "true");
  const query = params.toString();
  const res = await apiFetch(`/api/admin/metrics${query ? `?${query}` : ""}`);
  const json = await parseApiResponse<{
    routeStats?: AdminRouteMetricRow[];
    recentErrors?: AdminErrorMetricRow[];
    slo?: AdminSloSummary;
    quizQuality?: AdminQuizQualitySummary;
    clipper?: AdminClipperMetrics | null;
  }>(res, "Failed to load metrics.", "admin.metrics.get");
  return {
    routeStats: json.routeStats ?? [],
    recentErrors: json.recentErrors ?? [],
    slo: json.slo ?? null,
    quizQuality: json.quizQuality ?? null,
    clipper: json.clipper ?? null
  };
}

export async function recomputeAdminWordbookRank(): Promise<void> {
  const res = await apiFetch("/api/admin/wordbooks/recompute-rank", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  await parseApiResponse<{ ok?: boolean }>(res, "Failed to recompute rank.", "admin.wordbooks.recomputeRank");
}

export async function moderateAdminReport(input: {
  reportId: number;
  action: "review" | "resolve" | "dismiss" | "hide";
  note?: string;
}): Promise<void> {
  const res = await apiFetch(`/api/admin/reports/${input.reportId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: input.action, ...(input.note !== undefined ? { note: input.note } : {}) })
  });
  await parseApiResponse<{ ok?: boolean }>(res, "Failed to moderate report.", "admin.reports.moderate");
}

export async function updateAdminUserPlan(input: {
  userId: number;
  plan: "FREE" | "PRO";
  isAdmin: boolean;
  proUntil: string | null;
}): Promise<void> {
  const res = await apiFetch(`/api/admin/users/${input.userId}/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      plan: input.plan,
      isAdmin: input.isAdmin,
      proUntil: input.proUntil
    })
  });
  await parseApiResponse<{ user?: unknown }>(res, "Failed to update user plan.", "admin.users.updatePlan");
}
