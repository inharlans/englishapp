import { prisma } from "@/lib/prisma";
import { refreshWordbookRankScore } from "@/lib/wordbookRanking";

export class InternalRepository {
  async findExpiredProUserIds(now: Date): Promise<number[]> {
    const expiredUsers = await prisma.user.findMany({
      where: {
        plan: "PRO",
        proUntil: { not: null, lt: now }
      },
      select: { id: true }
    });
    return expiredUsers.map((u) => u.id);
  }

  async expirePlans(userIds: number[]): Promise<number> {
    if (userIds.length === 0) return 0;
    const result = await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { plan: "FREE", stripeSubscriptionStatus: "expired" }
    });
    return result.count;
  }

  async countStaleWordbookRanks(staleBefore: Date): Promise<number> {
    return prisma.wordbook.count({
      where: {
        OR: [{ rankScoreUpdatedAt: null }, { rankScoreUpdatedAt: { lt: staleBefore } }]
      }
    });
  }

  async findAllWordbookIds(): Promise<number[]> {
    const ids = await prisma.wordbook.findMany({ select: { id: true } });
    return ids.map((v) => v.id);
  }

  async recomputeWordbookRank(wordbookId: number): Promise<void> {
    await refreshWordbookRankScore(prisma, wordbookId);
  }
}
