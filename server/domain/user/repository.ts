import { prisma } from "@/lib/prisma";

export class UserRepository {
  async updateDailyGoal(userId: number, dailyGoal: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { dailyGoal }
    });
  }

  async listBlockedOwners(userId: number) {
    return prisma.blockedOwner.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        ownerId: true,
        createdAt: true,
        owner: { select: { email: true } }
      }
    });
  }

  async removeBlockedOwner(userId: number, ownerId: number): Promise<void> {
    await prisma.blockedOwner.deleteMany({
      where: { userId, ownerId }
    });
  }
}
