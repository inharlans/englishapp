import { prisma } from "@/lib/prisma";
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
