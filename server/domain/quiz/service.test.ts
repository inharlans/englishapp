import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCanAccessWordbookForStudy = vi.fn();
const mockInvalidateStudyPartStatsCacheForWordbook = vi.fn();

vi.mock("@/lib/wordbookAccess", () => ({
  canAccessWordbookForStudy: mockCanAccessWordbookForStudy
}));

vi.mock("@/lib/studyPartStatsCache", () => ({
  invalidateStudyPartStatsCacheForWordbook: mockInvalidateStudyPartStatsCacheForWordbook
}));

describe("QuizService submitWordbookQuizAnswer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanAccessWordbookForStudy.mockResolvedValue(true);
  });

  it("sets wrong requeue pointer when answer is wrong", async () => {
    const repo = {
      findWordbookItem: vi.fn().mockResolvedValue({
        id: 11,
        term: "apple",
        meaning: "사과"
      }),
      getStudyItemState: vi.fn().mockResolvedValue(null),
      upsertStudyStateAndIncrementQuestion: vi.fn().mockResolvedValue({
        meaningQuestionCount: 3,
        wordQuestionCount: 0
      }),
      upsertStudyItemState: vi.fn().mockResolvedValue(undefined),
      updateStudyStateCountsIfNeeded: vi.fn().mockResolvedValue(undefined)
    };

    const { QuizService } = await import("./service");
    const service = new QuizService(repo as never);

    const result = await service.submitWordbookQuizAnswer(
      {
        id: 1,
        email: "u@test.com",
        isAdmin: false,
        plan: "FREE",
        proUntil: null,
        dailyGoal: 10
      },
      99,
      {
        itemId: 11,
        mode: "MEANING",
        answer: "바나나"
      }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.correct).toBe(false);
    }
    expect(repo.upsertStudyItemState).toHaveBeenCalledWith(
      expect.objectContaining({
        modeWrongRequeueAt: 13,
        nextStatus: "WRONG"
      })
    );
  });

  it("uses mode-specific question count for WORD wrong requeue pointer", async () => {
    const repo = {
      findWordbookItem: vi.fn().mockResolvedValue({
        id: 12,
        term: "apple",
        meaning: "사과"
      }),
      getStudyItemState: vi.fn().mockResolvedValue(null),
      upsertStudyStateAndIncrementQuestion: vi.fn().mockResolvedValue({
        meaningQuestionCount: 40,
        wordQuestionCount: 9
      }),
      upsertStudyItemState: vi.fn().mockResolvedValue(undefined),
      updateStudyStateCountsIfNeeded: vi.fn().mockResolvedValue(undefined)
    };

    const { QuizService } = await import("./service");
    const service = new QuizService(repo as never);

    const result = await service.submitWordbookQuizAnswer(
      {
        id: 1,
        email: "u@test.com",
        isAdmin: false,
        plan: "FREE",
        proUntil: null,
        dailyGoal: 10
      },
      99,
      {
        itemId: 12,
        mode: "WORD",
        answer: "banana"
      }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.correct).toBe(false);
    }
    expect(repo.upsertStudyItemState).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "WORD",
        modeWrongRequeueAt: 19,
        nextStatus: "WRONG"
      })
    );
  });

  it("updates deltas when wrong state turns into correct state", async () => {
    const repo = {
      findWordbookItem: vi.fn().mockResolvedValue({
        id: 22,
        term: "apple",
        meaning: "사과"
      }),
      getStudyItemState: vi.fn().mockResolvedValue({
        status: "WRONG",
        streak: 0,
        everCorrect: false,
        everWrong: true,
        meaningCorrectStreak: 0,
        wordCorrectStreak: 0
      }),
      upsertStudyStateAndIncrementQuestion: vi.fn().mockResolvedValue({
        meaningQuestionCount: 7,
        wordQuestionCount: 0
      }),
      upsertStudyItemState: vi.fn().mockResolvedValue(undefined),
      updateStudyStateCountsIfNeeded: vi.fn().mockResolvedValue(undefined)
    };

    const { QuizService } = await import("./service");
    const service = new QuizService(repo as never);

    const result = await service.submitWordbookQuizAnswer(
      {
        id: 1,
        email: "u@test.com",
        isAdmin: false,
        plan: "FREE",
        proUntil: null,
        dailyGoal: 10
      },
      99,
      {
        itemId: 22,
        mode: "MEANING",
        answer: "사과"
      }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.correct).toBe(true);
    }
    expect(repo.updateStudyStateCountsIfNeeded).toHaveBeenCalledWith(
      expect.objectContaining({
        studiedDelta: 0,
        correctDelta: 1,
        wrongDelta: -1
      })
    );
  });
});
