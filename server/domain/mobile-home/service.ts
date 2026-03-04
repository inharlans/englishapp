import { MobileHomeRepository } from "@/server/domain/mobile-home/repository";

const DEFAULT_PART_SIZE = 20;

export class MobileHomeService {
  constructor(private readonly repo = new MobileHomeRepository()) {}

  async getStudyPreferences(userId: number) {
    const lastUsedWordbookId = await this.repo.findUserDefaultWordbookId(userId);

    return {
      lastUsedWordbookId: lastUsedWordbookId === null ? null : String(lastUsedWordbookId),
      partSize: DEFAULT_PART_SIZE
    };
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
