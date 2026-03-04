import { describe, expect, it, vi } from "vitest";

import { MobileHomeService } from "@/server/domain/mobile-home/service";
import type { MobileHomeRepository } from "@/server/domain/mobile-home/repository";

describe("MobileHomeService", () => {
  it("maps defaultWordbookId to string lastUsedWordbookId", async () => {
    const repo = {
      findUserDefaultWordbookId: vi.fn().mockResolvedValue(321)
    } as unknown as MobileHomeRepository;

    const service = new MobileHomeService(repo);
    const result = await service.getStudyPreferences(7);

    expect(result).toEqual({
      lastUsedWordbookId: "321",
      partSize: 20
    });
  });

  it("deduplicates owned/downloaded wordbooks when building summary", async () => {
    const mockCountWordbookItems = vi.fn().mockResolvedValue(14);
    const repo = {
      listOwnedWordbookIds: vi.fn().mockResolvedValue([1, 2]),
      listDownloadedWordbookIds: vi.fn().mockResolvedValue([2, 3]),
      countWordbookItems: mockCountWordbookItems
    } as unknown as MobileHomeRepository;

    const service = new MobileHomeService(repo);
    const result = await service.getSummary(7);

    expect(mockCountWordbookItems).toHaveBeenCalledWith([1, 2, 3]);
    expect(result).toMatchObject({
      todayCount: 0,
      weeklyCount: 0,
      totalWords: 14,
      totalWordbooks: 3,
      recentWords: [],
      isFallback: true
    });
  });
});
