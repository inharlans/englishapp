import { MobileHomeRepository } from "@/server/domain/mobile-home/repository";

const DEFAULT_PART_SIZE = 20;
const MAX_PART_SIZE = 100;

function normalizePartSize(partSize: number | null): number {
  if (!partSize || partSize <= 0) {
    return DEFAULT_PART_SIZE;
  }

  return Math.min(partSize, MAX_PART_SIZE);
}

export class MobileHomeService {
  constructor(private readonly repo = new MobileHomeRepository()) {}

  async getStudyPreferences(userId: number) {
    const [lastUsedWordbookId, partSize] = await Promise.all([
      this.repo.findUserDefaultWordbookId(userId),
      this.repo.findUserStudyPartSize(userId)
    ]);

    return {
      lastUsedWordbookId: lastUsedWordbookId === null ? null : String(lastUsedWordbookId),
      partSize: normalizePartSize(partSize)
    };
  }

  async updateStudyPreferences(userId: number, input: { partSize: number }) {
    await this.repo.updateUserStudyPartSize(userId, input.partSize);
    return this.getStudyPreferences(userId);
  }

  async getSummary(userId: number) {
    const [ownedIds, downloadedIds] = await Promise.all([
      this.repo.listOwnedWordbookIds(userId),
      this.repo.listDownloadedWordbookIds(userId)
    ]);

    const uniqueWordbookIds = [...new Set([...ownedIds, ...downloadedIds])];
    const totalWords = await this.repo.countWordbookItems(uniqueWordbookIds);

    return {
      todayCount: 0,
      weeklyCount: 0,
      totalWords,
      totalWordbooks: uniqueWordbookIds.length,
      recentWords: [],
      isFallback: true
    };
  }
}
