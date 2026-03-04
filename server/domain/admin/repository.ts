import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  MARKET_CURATED_MIN_DONE_RATIO,
  MARKET_CURATED_MIN_RATING_COUNT,
  MARKET_MIN_ITEM_COUNT
} from "@/lib/wordbookPolicy";
import { refreshWordbookRankScore } from "@/lib/wordbookRanking";
import type { ModerateReportInput, UpdateUserPlanInput } from "@/server/domain/admin/contracts";

export class AdminRepository {
  async findRawMetricsSince(since: Date) {
    return prisma.apiRequestMetric.findMany({
      where: { createdAt: { gte: since } },
      select: { route: true, status: true, latencyMs: true }
    });
  }

  async findRecentErrorsSince(since: Date) {
    return prisma.appErrorEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        level: true,
        route: true,
        message: true,
        context: true,
        createdAt: true
      }
    });
  }

  async findMarketQualityMetrics() {
    const rows = await prisma.$queryRaw<
      Array<{
        candidateTotal: number;
        eligibleTotal: number;
        curatedTotal: number;
        reason:
          | "CURATED_PASS"
          | "ADMIN_HIDDEN"
          | "NOT_PUBLIC"
          | "BELOW_MIN_ITEM_COUNT"
          | "LOW_RATING_COUNT"
          | "LOW_DONE_RATIO"
          | null;
        count: number;
      }>
    >(Prisma.sql`
      WITH item_stats AS (
        SELECT
          wi."wordbookId" AS wordbook_id,
          COUNT(*)::int AS total_count,
          COUNT(*) FILTER (WHERE wi."enrichmentStatus" = 'DONE')::int AS done_count
        FROM "WordbookItem" wi
        GROUP BY wi."wordbookId"
      ), base AS (
        SELECT
          wb."id" AS id,
          wb."isPublic" AS "isPublic",
          wb."hiddenByAdmin" AS "hiddenByAdmin",
          wb."ratingCount" AS "ratingCount",
          COALESCE(item_stats.total_count, 0) AS item_total,
          CASE
            WHEN COALESCE(item_stats.total_count, 0) = 0 THEN 0
            ELSE COALESCE(item_stats.done_count, 0)::float / item_stats.total_count::float
          END AS done_ratio
        FROM "Wordbook" wb
        LEFT JOIN item_stats ON item_stats.wordbook_id = wb."id"
      ), classified AS (
        SELECT
          "isPublic",
          "hiddenByAdmin",
          "ratingCount",
          item_total,
          done_ratio,
          (
            "isPublic" = true
            AND "hiddenByAdmin" = false
            AND item_total >= ${MARKET_MIN_ITEM_COUNT}
          ) AS is_eligible,
          CASE
            WHEN "hiddenByAdmin" = true THEN 'ADMIN_HIDDEN'
            WHEN "isPublic" = false THEN 'NOT_PUBLIC'
            WHEN item_total < ${MARKET_MIN_ITEM_COUNT} THEN 'BELOW_MIN_ITEM_COUNT'
            WHEN "ratingCount" < ${MARKET_CURATED_MIN_RATING_COUNT} THEN 'LOW_RATING_COUNT'
            WHEN done_ratio < ${MARKET_CURATED_MIN_DONE_RATIO} THEN 'LOW_DONE_RATIO'
            ELSE 'CURATED_PASS'
          END AS reason
        FROM base
      ), summary AS (
        SELECT
          COUNT(*)::int AS "candidateTotal",
          COUNT(*) FILTER (WHERE is_eligible)::int AS "eligibleTotal",
          COUNT(*) FILTER (WHERE reason = 'CURATED_PASS')::int AS "curatedTotal"
        FROM classified
      ), reason_counts AS (
        SELECT
          reason,
          COUNT(*)::int AS count
        FROM classified
        WHERE reason <> 'CURATED_PASS'
        GROUP BY reason
      )
      SELECT
        summary."candidateTotal" AS "candidateTotal",
        summary."eligibleTotal" AS "eligibleTotal",
        summary."curatedTotal" AS "curatedTotal",
        reason_counts.reason AS reason,
        COALESCE(reason_counts.count, 0)::int AS count
      FROM summary
      LEFT JOIN reason_counts ON TRUE
    `);

    const candidateTotal = rows[0]?.candidateTotal ?? 0;
    const eligibleTotal = rows[0]?.eligibleTotal ?? 0;
    const curatedTotal = rows[0]?.curatedTotal ?? 0;
    const reasons = rows
      .filter((row) => row.reason !== null && row.reason !== "CURATED_PASS")
      .map((row) => ({ reason: row.reason, count: row.count }));

    return {
      candidateTotal,
      eligibleTotal,
      curatedTotal,
      reasons
    };
  }

  async findReportsForAdmin() {
    return prisma.wordbookReport.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
      select: {
        id: true,
        reason: true,
        detail: true,
        status: true,
        reporterTrustScore: true,
        createdAt: true,
        reviewedAt: true,
        moderatorNote: true,
        reviewAction: true,
        previousStatus: true,
        nextStatus: true,
        reviewerIpHash: true,
        reporter: { select: { id: true, email: true } },
        reviewedBy: { select: { id: true, email: true } },
        wordbook: {
          select: {
            id: true,
            title: true,
            isPublic: true,
            hiddenByAdmin: true,
            owner: { select: { id: true, email: true } }
          }
        }
      }
    });
  }

  async findReportById(reportId: number) {
    return prisma.wordbookReport.findUnique({
      where: { id: reportId },
      select: { id: true, wordbookId: true, status: true }
    });
  }

  async markReportReviewing(input: ModerateReportInput & { reviewerId: number }) {
    await prisma.wordbookReport.update({
      where: { id: input.reportId },
      data: {
        reviewAction: "reviewing",
        reviewerIpHash: input.reviewerIpHash,
        reviewedById: input.reviewerId,
        reviewedAt: new Date(),
        moderatorNote: input.note
      }
    });
  }

  async hideWordbookAndResolveReport(input: {
    reportId: number;
    wordbookId: number;
    previousStatus: string;
    action: "hide";
    reviewerIpHash: string;
    reviewerId: number;
    note: string | null;
  }) {
    const nextStatus = "RESOLVED";
    await prisma.$transaction([
      prisma.wordbook.update({
        where: { id: input.wordbookId },
        data: { isPublic: false, hiddenByAdmin: true }
      }),
      prisma.wordbookReport.update({
        where: { id: input.reportId },
        data: {
          status: nextStatus,
          previousStatus: input.previousStatus as never,
          nextStatus,
          reviewAction: input.action,
          reviewerIpHash: input.reviewerIpHash,
          reviewedById: input.reviewerId,
          reviewedAt: new Date(),
          moderatorNote: input.note
        }
      })
    ]);
  }

  async closeReport(input: {
    reportId: number;
    previousStatus: string;
    nextStatus: "RESOLVED" | "DISMISSED";
    action: "resolve" | "dismiss";
    reviewerIpHash: string;
    reviewerId: number;
    note: string | null;
  }) {
    await prisma.wordbookReport.update({
      where: { id: input.reportId },
      data: {
        status: input.nextStatus,
        previousStatus: input.previousStatus as never,
        nextStatus: input.nextStatus,
        reviewAction: input.action,
        reviewerIpHash: input.reviewerIpHash,
        reviewedById: input.reviewerId,
        reviewedAt: new Date(),
        moderatorNote: input.note
      }
    });
  }

  async findUsersForAdmin() {
    return prisma.user.findMany({
      orderBy: { id: "asc" },
      select: { id: true, email: true, isAdmin: true, plan: true, proUntil: true, createdAt: true }
    });
  }

  async updateUserPlanForAdmin(input: UpdateUserPlanInput) {
    return prisma.user.update({
      where: { id: input.userId },
      data: {
        plan: input.plan,
        ...(input.proUntil === undefined ? {} : { proUntil: input.proUntil }),
        ...(typeof input.isAdmin === "boolean" ? { isAdmin: input.isAdmin } : {})
      },
      select: { id: true, email: true, isAdmin: true, plan: true, proUntil: true }
    });
  }

  async findAllWordbookIds() {
    return prisma.wordbook.findMany({ select: { id: true } });
  }

  async recomputeWordbookRank(wordbookId: number): Promise<void> {
    await refreshWordbookRankScore(prisma, wordbookId);
  }
}
