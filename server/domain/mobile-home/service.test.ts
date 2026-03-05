import { describe, expect, it, vi } from "vitest";

import { MobileHomeService } from "@/server/domain/mobile-home/service";
import type { MobileHomeRepository } from "@/server/domain/mobile-home/repository";

describe("MobileHomeService", () => {
  it("maps defaultWordbookId to string lastUsedWordbookId", async () => {
    const repo = {
      findUserDefaultWordbookId: vi.fn().mockResolvedValue(321),
      findUserStudyPartSize: vi.fn().mockResolvedValue(25)
    } as unknown as MobileHomeRepository;

    const service = new MobileHomeService(repo);
    const result = await service.getStudyPreferences(7);

    expect(result).toEqual({
      lastUsedWordbookId: "321",
      partSize: 25
    });
  });

  it("returns null lastUsedWordbookId when defaultWordbookId is missing", async () => {
    const repo = {
      findUserDefaultWordbookId: vi.fn().mockResolvedValue(null),
      findUserStudyPartSize: vi.fn().mockResolvedValue(null)
    } as unknown as MobileHomeRepository;

    const service = new MobileHomeService(repo);
    const result = await service.getStudyPreferences(7);

    expect(result).toEqual({
      lastUsedWordbookId: null,
      partSize: 20
    });
  });

  it("clamps persisted partSize above 100 to contract max", async () => {
    const repo = {
      findUserDefaultWordbookId: vi.fn().mockResolvedValue(11),
      findUserStudyPartSize: vi.fn().mockResolvedValue(150)
    } as unknown as MobileHomeRepository;

    const service = new MobileHomeService(repo);
    const result = await service.getStudyPreferences(7);

    expect(result).toEqual({
      lastUsedWordbookId: "11",
      partSize: 100
    });
  });

  it("clamps oversized study part size values", async () => {
    const repo = {
      findUserDefaultWordbookId: vi.fn().mockResolvedValue(321),
      findUserStudyPartSize: vi.fn().mockResolvedValue(300)
    } as unknown as MobileHomeRepository;

    const service = new MobileHomeService(repo);
    const result = await service.getStudyPreferences(7);

    expect(result).toEqual({
      lastUsedWordbookId: "321",
      partSize: 100
    });
  });

  it("updates and returns persisted study preferences", async () => {
    const mockUpdateUserStudyPartSize = vi.fn().mockResolvedValue(undefined);
    const repo = {
      updateUserStudyPartSize: mockUpdateUserStudyPartSize,
      findUserDefaultWordbookId: vi.fn().mockResolvedValue(100),
      findUserStudyPartSize: vi.fn().mockResolvedValue(40)
    } as unknown as MobileHomeRepository;

    const service = new MobileHomeService(repo);
    const result = await service.updateStudyPreferences(7, { partSize: 40 });

    expect(mockUpdateUserStudyPartSize).toHaveBeenCalledWith(7, 40);
    expect(result).toEqual({
      lastUsedWordbookId: "100",
      partSize: 40
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
