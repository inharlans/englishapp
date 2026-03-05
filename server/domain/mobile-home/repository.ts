import { prisma } from "@/lib/prisma";

export class MobileHomeRepository {
  async findUserDefaultWordbookId(userId: number): Promise<number | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultWordbookId: true }
    });

    return user?.defaultWordbookId ?? null;
  }

  async findUserStudyPartSize(userId: number): Promise<number | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { studyPartSize: true }
    });

    return user?.studyPartSize ?? null;
  }

  async updateUserStudyPartSize(userId: number, partSize: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { studyPartSize: partSize },
      select: { id: true }
    });
  }

  async listOwnedWordbookIds(userId: number): Promise<number[]> {
    const rows = await prisma.wordbook.findMany({
      where: { ownerId: userId },
      select: { id: true }
    });

    return rows.map((row) => row.id);
  }

  async listDownloadedWordbookIds(userId: number): Promise<number[]> {
    const rows = await prisma.wordbookDownload.findMany({
      where: { userId },
      select: { wordbookId: true }
    });

    return rows.map((row) => row.wordbookId);
  }

  async countWordbookItems(wordbookIds: number[]): Promise<number> {
    if (wordbookIds.length === 0) return 0;

    return prisma.wordbookItem.count({
      where: {
        wordbookId: {
          in: wordbookIds
        }
      }
    });
  }
}
