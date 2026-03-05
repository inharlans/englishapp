import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockUserFindUnique,
  mockUserUpdate,
  mockUserUpdateMany,
  mockWordbookFindFirst,
  mockWordbookItemFindFirst,
  mockWordbookItemFindUnique,
  mockWordbookItemCreate,
  mockWordbookItemUpdate
} = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockUserUpdate: vi.fn(),
  mockUserUpdateMany: vi.fn(),
  mockWordbookFindFirst: vi.fn(),
  mockWordbookItemFindFirst: vi.fn(),
  mockWordbookItemFindUnique: vi.fn(),
  mockWordbookItemCreate: vi.fn(),
  mockWordbookItemUpdate: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
      updateMany: mockUserUpdateMany
    },
    wordbook: {
      findFirst: mockWordbookFindFirst
    },
    wordbookItem: {
      findFirst: mockWordbookItemFindFirst,
      findUnique: mockWordbookItemFindUnique,
      create: mockWordbookItemCreate,
      update: mockWordbookItemUpdate
    },
  }
}));

const user = {
  id: 7,
  email: "clipper@test.com",
  isAdmin: false,
  plan: "FREE" as const,
  proUntil: null,
  dailyGoal: 20
};

describe("ClipperService captureWord", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("기본 단어장이 지정되지 않았으면 422를 반환한다", async () => {
    mockUserFindUnique.mockResolvedValue({ defaultWordbookId: null });

    const { ClipperService } = await import("./service");
    const service = new ClipperService();

    const result = await service.captureWord({
      user,
      data: {
        term: "abandoned",
        sourceUrl: "https://example.com/article"
      }
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(422);
      expect(result.error).toBe("지정된 단어장이 없습니다. 단어장을 지정해 주세요");
    }
    expect(mockWordbookItemCreate).not.toHaveBeenCalled();
  });

  it("기본 단어장이 유효하지 않으면 설정을 비우고 422를 반환한다", async () => {
    mockUserFindUnique.mockResolvedValue({ defaultWordbookId: 88 });
    mockWordbookFindFirst.mockResolvedValue(null);
    mockUserUpdateMany.mockResolvedValue({ count: 1 });

    const { ClipperService } = await import("./service");
    const service = new ClipperService();

    const result = await service.captureWord({
      user,
      data: {
        term: "abandoned"
      }
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(422);
      expect(result.error).toBe("지정된 단어장이 없습니다. 단어장을 지정해 주세요");
    }
    expect(mockUserUpdateMany).toHaveBeenCalledWith({
      where: { id: 7, defaultWordbookId: 88 },
      data: { defaultWordbookId: null }
    });
  });

  it("meaning/context가 모두 있으면 DONE으로 저장한다", async () => {
    mockUserFindUnique.mockResolvedValue({ defaultWordbookId: 44 });
    mockWordbookFindFirst.mockResolvedValue({ id: 44 });
    mockWordbookItemFindFirst.mockResolvedValue(null);
    mockWordbookItemCreate.mockResolvedValue({
      id: 901,
      wordbookId: 44,
      enrichmentStatus: "DONE"
    });

    const { ClipperService } = await import("./service");
    const service = new ClipperService();

    const result = await service.captureWord({
      user,
      data: {
        term: "abandoned",
        meaning: "버려진",
        context: "The house was abandoned for years."
      }
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.enrichmentStatus).toBe("DONE");
    }
    expect(mockWordbookItemCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          enrichmentStatus: "DONE",
          meaning: "버려진",
          exampleSentenceEn: "The house was abandoned for years."
        })
      })
    );
  });

  it("중복 단어 재저장 시 비어 있는 필드만 보강한다", async () => {
    mockUserFindUnique.mockResolvedValue({ defaultWordbookId: 44 });
    mockWordbookFindFirst.mockResolvedValue({ id: 44 });
    mockWordbookItemFindFirst
      .mockResolvedValueOnce({ id: 501 })
      .mockResolvedValueOnce({
        id: 501,
        wordbookId: 44,
        term: "abandoned",
        meaning: "abandoned",
        example: null,
        exampleSentenceEn: null,
        sourceUrl: null,
        sourceTitle: "기존 제목",
        exampleSource: "NONE",
        enrichmentStatus: "QUEUED"
      });
    mockWordbookItemFindUnique.mockResolvedValue({
      id: 501,
      wordbookId: 44,
      term: "abandoned",
      meaning: "abandoned",
      example: null,
      exampleSentenceEn: null,
      sourceUrl: null,
      sourceTitle: "기존 제목",
      exampleSource: "NONE",
      enrichmentStatus: "QUEUED"
    });
    mockWordbookItemUpdate.mockResolvedValue({
      id: 501,
      wordbookId: 44,
      enrichmentStatus: "DONE"
    });

    const { ClipperService } = await import("./service");
    const service = new ClipperService();

    const result = await service.captureWord({
      user,
      data: {
        term: "abandoned",
        meaning: "버려진",
        context: "The house was abandoned for years.",
        sourceUrl: "https://example.com/a",
        sourceTitle: "새 제목"
      }
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe(200);
      expect(result.payload.itemId).toBe(501);
      expect(result.payload.enrichmentStatus).toBe("DONE");
    }
    expect(mockWordbookItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 501 },
        data: expect.objectContaining({
          meaning: "버려진",
          exampleSentenceEn: "The house was abandoned for years.",
          sourceUrl: "https://example.com/a",
          sourceTitle: "기존 제목",
          enrichmentStatus: "DONE"
        })
      })
    );
  });

  it("표면형이 달라도 동일 normalizedTerm이면 중복 병합으로 처리한다", async () => {
    mockUserFindUnique.mockResolvedValue({ defaultWordbookId: 44 });
    mockWordbookFindFirst.mockResolvedValue({ id: 44 });
    mockWordbookItemFindFirst
      .mockResolvedValueOnce({ id: 777 });
    mockWordbookItemFindUnique.mockResolvedValue({
      id: 777,
      wordbookId: 44,
      term: "abandoned",
      meaning: "abandoned",
      example: null,
      exampleSentenceEn: null,
      sourceUrl: null,
      sourceTitle: null,
      exampleSource: "NONE",
      enrichmentStatus: "QUEUED"
    });
    mockWordbookItemUpdate.mockResolvedValue({
      id: 777,
      wordbookId: 44,
      enrichmentStatus: "DONE"
    });

    const { ClipperService } = await import("./service");
    const service = new ClipperService();

    const result = await service.captureWord({
      user,
      data: {
        term: "Abandoned.",
        meaning: "버려진",
        context: "The house was abandoned for years."
      }
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe(200);
      expect(result.payload.itemId).toBe(777);
    }
    expect(mockWordbookItemFindFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          wordbookId: 44,
          normalizedTerm: "abandoned"
        })
      })
    );
  });

  it("신규 normalizedTerm과 레거시 normalizedTerm을 함께 조회한다", async () => {
    mockUserFindUnique.mockResolvedValue({ defaultWordbookId: 44 });
    mockWordbookFindFirst.mockResolvedValue({ id: 44 });
    mockWordbookItemFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 778 });
    mockWordbookItemFindUnique.mockResolvedValue({
      id: 778,
      wordbookId: 44,
      term: "teacher's",
      meaning: "teacher's",
      example: null,
      exampleSentenceEn: null,
      sourceUrl: null,
      sourceTitle: null,
      exampleSource: "NONE",
      enrichmentStatus: "QUEUED"
    });
    mockWordbookItemUpdate.mockResolvedValue({
      id: 778,
      wordbookId: 44,
      enrichmentStatus: "DONE"
    });

    const { ClipperService } = await import("./service");
    const service = new ClipperService();

    const result = await service.captureWord({
      user,
      data: {
        term: "teacher's",
        meaning: "교사의",
        context: "The teacher's desk was near the window."
      }
    });

    expect(result.ok).toBe(true);
    expect(mockWordbookItemFindFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          wordbookId: 44,
          normalizedTerm: "teachers"
        })
      })
    );
    expect(mockWordbookItemFindFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          wordbookId: 44,
          normalizedTerm: "teacher's"
        })
      })
    );
  });

  it("비아포스트로피 정규화 드리프트에서도 레거시 키를 fallback 조회한다", async () => {
    mockUserFindUnique.mockResolvedValue({ defaultWordbookId: 44 });
    mockWordbookFindFirst.mockResolvedValue({ id: 44 });
    mockWordbookItemFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 779 });
    mockWordbookItemFindUnique.mockResolvedValue({
      id: 779,
      wordbookId: 44,
      term: "abandoned",
      meaning: "abandoned",
      example: null,
      exampleSentenceEn: null,
      sourceUrl: null,
      sourceTitle: null,
      exampleSource: "NONE",
      enrichmentStatus: "QUEUED"
    });
    mockWordbookItemUpdate.mockResolvedValue({
      id: 779,
      wordbookId: 44,
      enrichmentStatus: "DONE"
    });

    const { ClipperService } = await import("./service");
    const service = new ClipperService();

    const result = await service.captureWord({
      user,
      data: {
        term: "Ａｂａｎｄｏｎｅｄ",
        meaning: "버려진",
        context: "The house was abandoned for years."
      }
    });

    expect(result.ok).toBe(true);
    expect(mockWordbookItemFindFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          wordbookId: 44,
          normalizedTerm: "abandoned"
        })
      })
    );
    expect(mockWordbookItemFindFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          wordbookId: 44,
          normalizedTerm: "ａｂａｎｄｏｎｅｄ"
        })
      })
    );
  });
});
