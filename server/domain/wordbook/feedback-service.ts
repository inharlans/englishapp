import { WordbookRepository } from "@/server/domain/wordbook/repository";

export class WordbookFeedbackService {
  constructor(private readonly repo = new WordbookRepository()) {}

  async listReviews(wordbookId: number, take: number) {
    const wb = await this.repo.findWordbookPublicVisibilityMeta(wordbookId);
    if (!wb || !wb.isPublic || wb.hiddenByAdmin) {
      return { ok: false as const, status: 404, error: "Not found." };
    }

    const reviews = await this.repo.listReviews(wordbookId, take);
    return {
      ok: true as const,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        review: r.review,
        updatedAt: r.updatedAt,
        userEmail: r.user.email
      }))
    };
  }

  async reportWordbook(params: {
    wordbookId: number;
    reporterId: number;
    reason: string;
    detail: string | null;
  }) {
    const wb = await this.repo.findWordbookPublicVisibilityMeta(params.wordbookId);
    if (!wb || !wb.isPublic) {
      return { ok: false as const, status: 404, error: "Not found." };
    }

    const now = new Date();
    const cooldownStart = new Date(now.getTime() - 30_000);
    const dailyStart = new Date(now.getTime() - 24 * 60 * 60 * 1_000);

    const [recentReportCount, dailyReportCount] = await Promise.all([
      this.repo.countRecentReportsByReporter(params.reporterId, cooldownStart),
      this.repo.countRecentReportsByReporter(params.reporterId, dailyStart)
    ]);

    if (recentReportCount > 0) {
      return { ok: false as const, status: 429, error: "Report cooldown active. Please wait a bit." };
    }
    if (dailyReportCount >= 30) {
      return { ok: false as const, status: 429, error: "Daily report limit reached." };
    }

    const openCount = await this.repo.countOpenReportByReporterAndWordbook(params.reporterId, params.wordbookId);
    if (openCount > 0) {
      return { ok: false as const, status: 409, error: "You already have an open report for this wordbook." };
    }

    const [resolvedCount, dismissedCount] = await Promise.all([
      this.repo.countReportsByReporterAndStatus(params.reporterId, "RESOLVED"),
      this.repo.countReportsByReporterAndStatus(params.reporterId, "DISMISSED")
    ]);

    const reviewedCount = resolvedCount + dismissedCount;
    const trustedRatio = reviewedCount > 0 ? resolvedCount / reviewedCount : 0.6;
    const reporterTrustScore = Math.max(0, Math.min(100, Math.round(trustedRatio * 100)));

    const report = await this.repo.createReport({
      wordbookId: params.wordbookId,
      reporterId: params.reporterId,
      reason: params.reason,
      detail: params.detail,
      reporterTrustScore
    });

    return { ok: true as const, report };
  }
}

