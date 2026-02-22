import type { WordbookReportStatus } from "@prisma/client";

export interface AdminActor {
  id: number;
  email: string;
  isAdmin: boolean;
}

export interface AdminRouteMetric {
  route: string;
  total: number;
  status4xx: number;
  status5xx: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
}

export interface AdminMetricsPayload {
  since: string;
  routeStats: AdminRouteMetric[];
  quizQuality: {
    wrongAnswers: number;
    disputableWrongCount: number;
    disputableWrongRate: number;
  };
  slo: {
    apiSuccessRate: number;
    apiSuccessTarget: number;
    cronSuccessRate: number;
    cronSuccessTarget: number;
    coreP95LatencyMs: number;
    coreP95LatencyTargetMs: number;
    violations: string[];
  };
  recentErrors: Array<{
    id: number;
    level: string;
    route: string | null;
    message: string;
    context: unknown;
    createdAt: string;
  }>;
}

export interface ModerateReportInput {
  reportId: number;
  action: "review" | "resolve" | "dismiss" | "hide";
  note: string | null;
  reviewerIpHash: string;
}

export interface UpdateUserPlanInput {
  userId: number;
  plan: "FREE" | "PRO";
  proUntil: Date | null | undefined;
  isAdmin: boolean | undefined;
}

export interface ReportListItem {
  id: number;
  reason: string;
  detail: string | null;
  status: WordbookReportStatus;
  reporterTrustScore: number;
  createdAt: Date;
  reviewedAt: Date | null;
  moderatorNote: string | null;
  reviewAction: string | null;
  previousStatus: WordbookReportStatus | null;
  nextStatus: WordbookReportStatus | null;
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
}

export type AdminServiceResult<T> =
  | { ok: true; status: 200; payload: T }
  | { ok: false; status: 401 | 403 | 404; error: string };
