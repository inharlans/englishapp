import { maskEmailAddress } from "@/lib/textQuality";
import type {
  AdminActor,
  AdminMetricsPayload,
  AdminServiceResult,
  ModerateReportInput,
  UpdateUserPlanInput
} from "@/server/domain/admin/contracts";
import { AdminRepository } from "@/server/domain/admin/repository";
import { InternalService } from "@/server/domain/internal/service";

function requireAdmin(actor: AdminActor | null): AdminServiceResult<never> | null {
  if (!actor) return { ok: false, status: 401, error: "Unauthorized." };
  if (!actor.isAdmin) return { ok: false, status: 403, error: "Forbidden." };
  return null;
}

export class AdminService {
  constructor(
    private readonly repo = new AdminRepository(),
    private readonly internalService = new InternalService()
  ) {}

  async getMetrics(
    actor: AdminActor | null,
    options?: { clipperWindow?: "1h" | "24h" | "7d"; clipperRefresh?: boolean }
  ): Promise<AdminServiceResult<AdminMetricsPayload>> {
    const guard = requireAdmin(actor);
    if (guard) return guard;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [rawMetrics, recentErrors] = await Promise.all([
      this.repo.findRawMetricsSince(since),
      this.repo.findRecentErrorsSince(since)
    ]);

    const quizDiagnostics = recentErrors.filter(
      (e) => e.route === "/api/wordbooks/[id]/quiz/submit" && e.message === "quiz_grading_diagnostic"
    );

    const byRoute = new Map<
      string,
      { route: string; total: number; status4xx: number; status5xx: number; latencySum: number }
    >();
    const latencyByRoute = new Map<string, number[]>();

    for (const m of rawMetrics) {
      const key = m.route;
      const prev = byRoute.get(key) ?? { route: key, total: 0, status4xx: 0, status5xx: 0, latencySum: 0 };
      prev.total += 1;
      if (m.status >= 400 && m.status < 500) prev.status4xx += 1;
      if (m.status >= 500) prev.status5xx += 1;
      prev.latencySum += m.latencyMs;
      byRoute.set(key, prev);

      const arr = latencyByRoute.get(key) ?? [];
      arr.push(m.latencyMs);
      latencyByRoute.set(key, arr);
    }

    const routeStats = Array.from(byRoute.values()).map((s) => {
      const arr = (latencyByRoute.get(s.route) ?? []).sort((a, b) => a - b);
      const p95Index = arr.length ? Math.floor(arr.length * 0.95) : 0;
      const p95 = arr.length ? arr[Math.min(p95Index, arr.length - 1)] : 0;
      return {
        route: s.route,
        total: s.total,
        status4xx: s.status4xx,
        status5xx: s.status5xx,
        avgLatencyMs: s.total ? Math.round(s.latencySum / s.total) : 0,
        p95LatencyMs: p95
      };
    });
    routeStats.sort((a, b) => b.total - a.total);

    const totalRequests = rawMetrics.length;
    const successRequests = rawMetrics.filter((m) => m.status < 500).length;
    const apiSuccessRate = totalRequests > 0 ? (successRequests / totalRequests) * 100 : 100;

    const cronMetrics = rawMetrics.filter((m) => m.route.startsWith("/api/internal/cron/"));
    const cronTotal = cronMetrics.length;
    const cronSuccess = cronMetrics.filter((m) => m.status < 500).length;
    const cronSuccessRate = cronTotal > 0 ? (cronSuccess / cronTotal) * 100 : 100;

    const coreRoutes = ["/api/auth/login", "/api/wordbooks/market", "/api/wordbooks"];
    const coreLatencies = rawMetrics
      .filter((m) => coreRoutes.some((route) => m.route.startsWith(route)))
      .map((m) => m.latencyMs)
      .sort((a, b) => a - b);
    const coreP95 = coreLatencies.length
      ? coreLatencies[Math.min(coreLatencies.length - 1, Math.floor(coreLatencies.length * 0.95))]
      : 0;

    const disputableWrongCount = quizDiagnostics.filter(
      (e) =>
        Boolean(
          (e.context as
            | {
                potentiallyDisputable?: boolean;
              }
            | null
            | undefined)?.potentiallyDisputable
        )
    ).length;
    const quizWrongCount = quizDiagnostics.length;
    const disputableWrongRate = quizWrongCount > 0 ? (disputableWrongCount / quizWrongCount) * 100 : 0;

    const clipperWindow = options?.clipperWindow ?? "24h";
    const [clipperResult, marketQualityResult] = await Promise.all([
      this.internalService.getClipperMetrics({
        authorizationHeader: null,
        trustedInternal: true,
        window: clipperWindow,
        includeSeries: true,
        refresh: options?.clipperRefresh ?? false
      }),
      this.repo.findMarketQualityMetrics()
    ]);
    const clipper = clipperResult.ok ? clipperResult.payload : null;

    const reasonOrder = [
      "ADMIN_HIDDEN",
      "NOT_PUBLIC",
      "BELOW_MIN_ITEM_COUNT",
      "LOW_RATING_COUNT",
      "LOW_DONE_RATIO"
    ] as const;
    const reasonMap = new Map(marketQualityResult.reasons.map((row) => [row.reason, row.count]));
    const dropReasons = reasonOrder.map((reason) => {
      const count = reasonMap.get(reason) ?? 0;
      return {
        reason,
        count,
        pct:
          marketQualityResult.candidateTotal > 0
            ? Number(((count / marketQualityResult.candidateTotal) * 100).toFixed(2))
            : 0
      };
    });

    return {
      ok: true,
      status: 200,
      payload: {
        since: since.toISOString(),
        routeStats,
        quizQuality: {
          wrongAnswers: quizWrongCount,
          disputableWrongCount,
          disputableWrongRate
        },
        slo: {
          apiSuccessRate,
          apiSuccessTarget: 99.5,
          cronSuccessRate,
          cronSuccessTarget: 99,
          coreP95LatencyMs: coreP95,
          coreP95LatencyTargetMs: 500,
          violations: [
            ...(apiSuccessRate < 99.5 ? ["24시간 API 성공률이 99.5% 미만"] : []),
            ...(cronSuccessRate < 99 ? ["24시간 크론 성공률이 99% 미만"] : []),
            ...(coreP95 > 500 ? ["핵심 경로 P95가 500ms 초과"] : []),
            ...(disputableWrongRate > 15 ? ["퀴즈 오답 중 재검토 후보 비율이 15% 초과"] : [])
          ]
        },
        recentErrors: recentErrors.map((e) => ({
          ...e,
          createdAt: e.createdAt.toISOString()
        })),
        clipper,
        marketQuality: {
          candidateTotal: marketQualityResult.candidateTotal,
          eligibleTotal: marketQualityResult.eligibleTotal,
          curatedTotal: marketQualityResult.curatedTotal,
          dropReasons
        }
      }
    };
  }

  async listReports(actor: AdminActor | null): Promise<AdminServiceResult<{ reports: unknown[] }>> {
    const guard = requireAdmin(actor);
    if (guard) return guard;

    const reports = await this.repo.findReportsForAdmin();
    return {
      ok: true,
      status: 200 as const,
      payload: {
        reports: reports.map((r) => {
          const qualityScore = Math.max(
            0,
            Math.min(100, 100 - (r.wordbook.hiddenByAdmin ? 35 : 0) - (r.status === "OPEN" ? 20 : 0) - (r.reporterTrustScore < 0 ? 10 : 0))
          );
          return {
            ...r,
            qualityScore,
            reporter: { ...r.reporter, email: maskEmailAddress(r.reporter.email) },
            reviewedBy: r.reviewedBy ? { ...r.reviewedBy, email: maskEmailAddress(r.reviewedBy.email) } : null,
            wordbook: {
              ...r.wordbook,
              owner: { ...r.wordbook.owner, email: maskEmailAddress(r.wordbook.owner.email) }
            }
          };
        })
      }
    };
  }

  async moderateReport(actor: AdminActor | null, input: ModerateReportInput): Promise<AdminServiceResult<{ ok: true }>> {
    const guard = requireAdmin(actor);
    if (guard) return guard;

    const admin = actor as AdminActor;
    const report = await this.repo.findReportById(input.reportId);
    if (!report) return { ok: false, status: 404, error: "Not found." };

    if (input.action === "review") {
      await this.repo.markReportReviewing({
        ...input,
        reviewerId: admin.id
      });
      return { ok: true, status: 200, payload: { ok: true } };
    }

    if (input.action === "hide") {
      await this.repo.hideWordbookAndResolveReport({
        reportId: input.reportId,
        wordbookId: report.wordbookId,
        previousStatus: report.status,
        action: "hide",
        reviewerIpHash: input.reviewerIpHash,
        reviewerId: admin.id,
        note: input.note
      });
      return { ok: true, status: 200, payload: { ok: true } };
    }

    const nextStatus = input.action === "resolve" ? "RESOLVED" : "DISMISSED";
    await this.repo.closeReport({
      reportId: input.reportId,
      previousStatus: report.status,
      nextStatus,
      action: input.action,
      reviewerIpHash: input.reviewerIpHash,
      reviewerId: admin.id,
      note: input.note
    });
    return { ok: true, status: 200, payload: { ok: true } };
  }

  async listUsers(actor: AdminActor | null): Promise<AdminServiceResult<{ users: unknown[] }>> {
    const guard = requireAdmin(actor);
    if (guard) return guard;

    const users = await this.repo.findUsersForAdmin();
    return {
      ok: true,
      status: 200,
      payload: { users: users.map((u) => ({ ...u, email: maskEmailAddress(u.email) })) }
    };
  }

  async updateUserPlan(actor: AdminActor | null, input: UpdateUserPlanInput): Promise<AdminServiceResult<{ user: unknown }>> {
    const guard = requireAdmin(actor);
    if (guard) return guard;

    const updated = await this.repo.updateUserPlanForAdmin(input);
    return { ok: true, status: 200, payload: { user: updated } };
  }

  async recomputeWordbookRank(actor: AdminActor | null): Promise<AdminServiceResult<{ ok: true; count: number }>> {
    const guard = requireAdmin(actor);
    if (guard) return guard;

    const ids = await this.repo.findAllWordbookIds();
    for (const wb of ids) {
      await this.repo.recomputeWordbookRank(wb.id);
    }
    return { ok: true, status: 200, payload: { ok: true, count: ids.length } };
  }
}
