import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockUserFindUnique,
  mockUserUpdate,
  mockUserUpdateMany,
  mockWordbookFindFirst,
  mockWordbookCreate,
  mockWordbookItemFindFirst,
  mockWordbookItemCreate,
  mockWordbookItemUpdate,
  mockTransaction
} = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockUserUpdate: vi.fn(),
  mockUserUpdateMany: vi.fn(),
  mockWordbookFindFirst: vi.fn(),
  mockWordbookCreate: vi.fn(),
  mockWordbookItemFindFirst: vi.fn(),
  mockWordbookItemCreate: vi.fn(),
  mockWordbookItemUpdate: vi.fn(),
  mockTransaction: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
      updateMany: mockUserUpdateMany
    },
    wordbook: {
      findFirst: mockWordbookFindFirst,
      create: mockWordbookCreate
    },
    wordbookItem: {
      findFirst: mockWordbookItemFindFirst,
      create: mockWordbookItemCreate,
      update: mockWordbookItemUpdate
    },
    $transaction: mockTransaction
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
    vi.clearAllMocks();

    mockTransaction.mockImplementation(async (callback) => {
      const tx = {
        user: {
          findUnique: mockUserFindUnique,
          update: mockUserUpdate,
          updateMany: mockUserUpdateMany
        },
        $queryRaw: vi.fn().mockResolvedValue([{ id: user.id }]),
        wordbook: {
          findFirst: mockWordbookFindFirst,
          create: mockWordbookCreate
        }
      };
      return callback(tx);
    });
  });

  it("자동으로 기본 단어장을 생성하고 QUEUED 아이템을 저장한다", async () => {
    mockUserFindUnique.mockResolvedValue({ defaultWordbookId: null });
    mockWordbookFindFirst.mockResolvedValue(null);
    mockWordbookCreate.mockResolvedValue({ id: 101 });
    mockUserUpdateMany.mockResolvedValue({ count: 1 });
    mockWordbookItemFindFirst.mockResolvedValue(null);
    mockWordbookItemCreate.mockResolvedValue({
      id: 900,
      wordbookId: 101,
      enrichmentStatus: "QUEUED"
    });

    const { ClipperService } = await import("./service");
    const service = new ClipperService();

    const result = await service.captureWord({
      user,
      data: {
        term: "abandoned",
        sourceUrl: "https://example.com/article"
      }
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe(201);
      expect(result.payload).toMatchObject({
        itemId: 900,
        wordbookId: 101,
        enrichmentStatus: "QUEUED"
      });
    }
    expect(mockWordbookCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: "개인 기본 단어장" }) })
    );
    expect(mockUserUpdateMany).toHaveBeenCalledWith({
      where: { id: 7, defaultWordbookId: null },
      data: { defaultWordbookId: 101 }
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
});
