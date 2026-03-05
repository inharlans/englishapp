import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEnrichWithGeminiBatch = vi.fn();
const mockTranslateWithGoogle = vi.fn();
const mockCaptureAppError = vi.fn();
const mockLogJson = vi.fn();

vi.mock("@/lib/clipperEnrichment", () => ({
  enrichWithGeminiBatch: mockEnrichWithGeminiBatch,
  translateWithGoogle: mockTranslateWithGoogle
}));

vi.mock("@/lib/observability", () => ({
  captureAppError: mockCaptureAppError
}));

vi.mock("@/lib/logger", () => ({
  logJson: mockLogJson
}));

describe("InternalService runClipperEnrichmentCron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-secret";
    process.env.CLIPPER_ENRICH_BATCH_SIZE = "1";
    process.env.CLIPPER_ENRICH_MAX_WAIT_SECONDS = "1";
    process.env.CLIPPER_ENRICH_MAX_ATTEMPTS = "3";
    process.env.CLIPPER_ENRICH_MAX_PER_OWNER_PER_RUN = "0";
  });

  it("transitions claimed queued items to done and returns run summary", async () => {
    const queuedAt = new Date("2026-03-04T00:00:00.000Z");
    const repo = {
      listRetriableFailedClipperItems: vi.fn().mockResolvedValue([]),
      requeueClipperItems: vi.fn().mockResolvedValue(0),
      listQueuedClipperItems: vi.fn().mockResolvedValue([
        {
          id: 101,
          ownerId: 1,
          wordbookId: 10,
          term: "apple",
          exampleSentenceEn: "I ate an apple.",
          enrichmentAttempts: 0,
          enrichmentQueuedAt: queuedAt
        }
      ]),
      claimQueuedClipperItemsByIds: vi.fn().mockResolvedValue([101]),
      loadClipperItemsForProcessing: vi.fn().mockResolvedValue([
        { id: 101, term: "apple", meaning: "apple", exampleSentenceEn: "I ate an apple." }
      ]),
      markClipperItemDone: vi.fn().mockResolvedValue(undefined),
      markClipperItemFailed: vi.fn().mockResolvedValue(undefined)
    };

    mockEnrichWithGeminiBatch.mockResolvedValue(
      new Map([
        [
          101,
          {
            id: 101,
            meaningKo: "사과",
            partOfSpeech: "NOUN",
            exampleSentenceEn: "I ate an apple.",
            exampleSentenceKo: "나는 사과를 먹었다.",
            exampleSource: "SOURCE"
          }
        ]
      ])
    );

    const { InternalService } = await import("./service");
    const service = new InternalService(repo as never);

    const result = await service.runClipperEnrichmentCron("Bearer cron-secret");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe(200);
      expect(result.payload).toMatchObject({
        ok: true,
        picked: 1,
        succeeded: 1,
        failed: 0,
        skipped: 0,
        claimedCount: 1,
        processedCount: 1,
        doneCount: 1,
        failedCount: 0,
        terminalFailedCount: 0
      });
      expect(typeof result.payload.durationMs).toBe("number");
    }
    expect(repo.markClipperItemDone).toHaveBeenCalledTimes(1);
    expect(repo.markClipperItemFailed).not.toHaveBeenCalled();
    expect(mockLogJson).toHaveBeenCalledWith(
      "info",
      "cron_clipper_enrichment_run_summary",
      expect.objectContaining({ picked: 1, succeeded: 1, failed: 0 })
    );
  });

  it("records attempts and failure details when gemini fails", async () => {
    const queuedAt = new Date("2026-03-04T00:00:00.000Z");
    const repo = {
      listRetriableFailedClipperItems: vi.fn().mockResolvedValue([]),
      requeueClipperItems: vi.fn().mockResolvedValue(0),
      listQueuedClipperItems: vi.fn().mockResolvedValue([
        {
          id: 202,
          ownerId: 1,
          wordbookId: 10,
          term: "banana",
          exampleSentenceEn: null,
          enrichmentAttempts: 0,
          enrichmentQueuedAt: queuedAt
        }
      ]),
      claimQueuedClipperItemsByIds: vi.fn().mockResolvedValue([202]),
      loadClipperItemsForProcessing: vi.fn().mockResolvedValue([
        { id: 202, term: "banana", meaning: "banana", exampleSentenceEn: null }
      ]),
      markClipperItemDone: vi.fn().mockResolvedValue(undefined),
      markClipperItemFailed: vi.fn().mockResolvedValue(undefined)
    };

    mockEnrichWithGeminiBatch.mockRejectedValue(new Error("Gemini request failed with status 429"));
    mockTranslateWithGoogle.mockResolvedValue(null);

    const { InternalService } = await import("./service");
    const service = new InternalService(repo as never);

    const result = await service.runClipperEnrichmentCron("Bearer cron-secret");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload).toMatchObject({
        picked: 1,
        succeeded: 0,
        failed: 1,
        failedCount: 1,
        doneCount: 0,
        terminalFailedCount: 0
      });
    }
    expect(repo.markClipperItemDone).not.toHaveBeenCalled();
    expect(repo.markClipperItemFailed).toHaveBeenCalledWith(
      expect.objectContaining({ id: 202, message: expect.stringContaining("GOOGLE_TRANSLATE_FALLBACK_EMPTY") })
    );
    expect(mockCaptureAppError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "cron_clipper_enrichment_batch_failed",
        context: expect.objectContaining({ reasonCode: "RATE_LIMIT", itemCount: 1 })
      })
    );
    expect(mockCaptureAppError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "cron_clipper_enrichment_item_failed",
        context: expect.objectContaining({ itemId: 202, attempt: 1, reasonCode: "GOOGLE_TRANSLATE_FALLBACK_EMPTY" })
      })
    );
  });

  it("does not process the same item twice when two runs overlap", async () => {
    const queuedAt = new Date("2026-03-04T00:00:00.000Z");
    let alreadyClaimed = false;
    const repo = {
      listRetriableFailedClipperItems: vi.fn().mockResolvedValue([]),
      requeueClipperItems: vi.fn().mockResolvedValue(0),
      listQueuedClipperItems: vi.fn().mockResolvedValue([
        {
          id: 303,
          ownerId: 1,
          wordbookId: 10,
          term: "carrot",
          exampleSentenceEn: null,
          enrichmentAttempts: 0,
          enrichmentQueuedAt: queuedAt
        }
      ]),
      claimQueuedClipperItemsByIds: vi.fn().mockImplementation(async (ids: number[]) => {
        if (alreadyClaimed) return [];
        alreadyClaimed = true;
        return ids;
      }),
      loadClipperItemsForProcessing: vi.fn().mockResolvedValue([
        { id: 303, term: "carrot", meaning: "carrot", exampleSentenceEn: null }
      ]),
      markClipperItemDone: vi.fn().mockResolvedValue(undefined),
      markClipperItemFailed: vi.fn().mockResolvedValue(undefined)
    };

    mockEnrichWithGeminiBatch.mockResolvedValue(
      new Map([
        [
          303,
          {
            id: 303,
            meaningKo: "당근",
            partOfSpeech: "NOUN",
            exampleSentenceEn: null,
            exampleSentenceKo: null,
            exampleSource: "NONE"
          }
        ]
      ])
    );

    const { InternalService } = await import("./service");
    const service = new InternalService(repo as never);

    const [a, b] = await Promise.all([
      service.runClipperEnrichmentCron("Bearer cron-secret"),
      service.runClipperEnrichmentCron("Bearer cron-secret")
    ]);

    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    const pickedTotal =
      (a.ok ? Number((a.payload as { picked: number }).picked ?? 0) : 0) +
      (b.ok ? Number((b.payload as { picked: number }).picked ?? 0) : 0);
    expect(pickedTotal).toBe(1);
    expect(repo.markClipperItemDone).toHaveBeenCalledTimes(1);
    expect(repo.markClipperItemFailed).not.toHaveBeenCalled();
  });

  it("returns zero summary when no queued item exists", async () => {
    const repo = {
      listRetriableFailedClipperItems: vi.fn().mockResolvedValue([]),
      requeueClipperItems: vi.fn().mockResolvedValue(0),
      listQueuedClipperItems: vi.fn().mockResolvedValue([]),
      claimQueuedClipperItemsByIds: vi.fn().mockResolvedValue([]),
      loadClipperItemsForProcessing: vi.fn().mockResolvedValue([]),
      markClipperItemDone: vi.fn().mockResolvedValue(undefined),
      markClipperItemFailed: vi.fn().mockResolvedValue(undefined)
    };

    const { InternalService } = await import("./service");
    const service = new InternalService(repo as never);

    const result = await service.runClipperEnrichmentCron("Bearer cron-secret");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload).toMatchObject({
        picked: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        claimedCount: 0,
        processedCount: 0,
        doneCount: 0,
        failedCount: 0
      });
    }
    expect(mockEnrichWithGeminiBatch).not.toHaveBeenCalled();
  });

  it("applies per-owner quota when configured", async () => {
    process.env.CLIPPER_ENRICH_BATCH_SIZE = "2";
    process.env.CLIPPER_ENRICH_MAX_PER_OWNER_PER_RUN = "1";

    const queuedAt = new Date("2026-03-04T00:00:00.000Z");
    const repo = {
      listRetriableFailedClipperItems: vi.fn().mockResolvedValue([]),
      requeueClipperItems: vi.fn().mockResolvedValue(0),
      listQueuedClipperItems: vi.fn().mockResolvedValue([
        { id: 401, ownerId: 1, wordbookId: 10, term: "a", exampleSentenceEn: null, enrichmentAttempts: 0, enrichmentQueuedAt: queuedAt },
        { id: 402, ownerId: 1, wordbookId: 11, term: "b", exampleSentenceEn: null, enrichmentAttempts: 0, enrichmentQueuedAt: queuedAt },
        { id: 403, ownerId: 2, wordbookId: 12, term: "c", exampleSentenceEn: null, enrichmentAttempts: 0, enrichmentQueuedAt: queuedAt }
      ]),
      claimQueuedClipperItemsByIds: vi.fn().mockResolvedValue([401, 403]),
      loadClipperItemsForProcessing: vi.fn().mockResolvedValue([
        { id: 401, term: "a", meaning: "a", exampleSentenceEn: null },
        { id: 403, term: "c", meaning: "c", exampleSentenceEn: null }
      ]),
      markClipperItemDone: vi.fn().mockResolvedValue(undefined),
      markClipperItemFailed: vi.fn().mockResolvedValue(undefined)
    };

    mockEnrichWithGeminiBatch.mockResolvedValue(
      new Map([
        [401, { id: 401, meaningKo: "에이", partOfSpeech: "NOUN", exampleSentenceEn: null, exampleSentenceKo: null, exampleSource: "NONE" }],
        [403, { id: 403, meaningKo: "씨", partOfSpeech: "NOUN", exampleSentenceEn: null, exampleSentenceKo: null, exampleSource: "NONE" }]
      ])
    );

    const { InternalService } = await import("./service");
    const service = new InternalService(repo as never);

    const result = await service.runClipperEnrichmentCron("Bearer cron-secret");

    expect(result.ok).toBe(true);
    expect(repo.claimQueuedClipperItemsByIds).toHaveBeenCalledWith([401, 403]);
    expect(repo.markClipperItemDone).toHaveBeenCalledTimes(2);
  });
});
