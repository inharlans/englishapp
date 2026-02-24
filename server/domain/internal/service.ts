import { PartOfSpeech } from "@prisma/client";

import { enrichWithGeminiBatch, translateWithGoogle, type EnrichmentResult } from "@/lib/clipperEnrichment";
import { captureAppError } from "@/lib/observability";
import type { InternalCronServiceResult } from "@/server/domain/internal/contracts";
import { InternalRepository } from "@/server/domain/internal/repository";

function isAuthorized(authorizationHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (authorizationHeader ?? "") === `Bearer ${secret}`;
}

export class InternalService {
  constructor(private readonly repo = new InternalRepository()) {}

  async runPlanExpireCron(authorizationHeader: string | null): Promise<InternalCronServiceResult> {
    if (!isAuthorized(authorizationHeader)) {
      return { ok: false, status: 403, error: "Forbidden." };
    }

    try {
      const now = new Date();
      const expiredIds = await this.repo.findExpiredProUserIds(now);
      const expiredCount = await this.repo.expirePlans(expiredIds);

      return {
        ok: true,
        status: 200,
        payload: {
          ok: true,
          expiredCount,
          ranAt: now.toISOString()
        }
      };
    } catch (error) {
      await captureAppError({
        route: "/api/internal/cron/plan-expire",
        message: "cron_plan_expire_failed",
        stack: error instanceof Error ? error.stack : undefined,
        context: { err: error instanceof Error ? error.message : String(error) }
      });
      return { ok: false, status: 500, error: "Plan expiration cron failed." };
    }
  }

  async runWordbookRankCron(authorizationHeader: string | null): Promise<InternalCronServiceResult> {
    if (!isAuthorized(authorizationHeader)) {
      return { ok: false, status: 403, error: "Forbidden." };
    }

    try {
      const staleBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const staleCount = await this.repo.countStaleWordbookRanks(staleBefore);

      const ids = await this.repo.findAllWordbookIds();
      for (const id of ids) {
        await this.repo.recomputeWordbookRank(id);
      }

      return {
        ok: true,
        status: 200,
        payload: {
          ok: true,
          recomputedCount: ids.length,
          staleCountBeforeRun: staleCount,
          ranAt: new Date().toISOString()
        }
      };
    } catch (error) {
      await captureAppError({
        route: "/api/internal/cron/wordbook-rank",
        message: "cron_wordbook_rank_failed",
        stack: error instanceof Error ? error.stack : undefined,
        context: { err: error instanceof Error ? error.message : String(error) }
      });
      return { ok: false, status: 500, error: "Wordbook rank cron failed." };
    }
  }

  async runClipperEnrichmentCron(authorizationHeader: string | null): Promise<InternalCronServiceResult> {
    if (!isAuthorized(authorizationHeader)) {
      return { ok: false, status: 403, error: "Forbidden." };
    }

    const batchSize = Math.min(
      25,
      Math.max(1, Number.parseInt(process.env.CLIPPER_ENRICH_BATCH_SIZE ?? "10", 10) || 10)
    );
    const maxWaitSeconds = Math.max(
      1,
      Number.parseInt(process.env.CLIPPER_ENRICH_MAX_WAIT_SECONDS ?? "60", 10) || 60
    );
    const maxAttempts = Math.max(
      1,
      Number.parseInt(process.env.CLIPPER_ENRICH_MAX_ATTEMPTS ?? "3", 10) || 3
    );

    try {
      const now = Date.now();
      const retriableFailed = await this.repo.listRetriableFailedClipperItems({
        maxAttempts,
        limit: 200
      });
      const backoffIds = retriableFailed
        .filter((item) => {
          const completedAt = item.enrichmentCompletedAt?.getTime() ?? 0;
          const backoffMs = Math.min(30 * 60 * 1000, Math.pow(2, Math.max(0, item.enrichmentAttempts - 1)) * 15_000);
          return completedAt > 0 && now - completedAt >= backoffMs;
        })
        .map((item) => item.id);
      const requeuedCount = await this.repo.requeueClipperItems(backoffIds);

      const queuedPool = await this.repo.listQueuedClipperItems(500);
      const eligibleIds = pickEligibleQueuedIds({
        items: queuedPool,
        minGroupSize: batchSize,
        maxWaitSeconds,
        maxPick: batchSize
      });
      const claimedIds = await this.repo.claimQueuedClipperItemsByIds(eligibleIds);
      if (claimedIds.length === 0) {
        return {
          ok: true,
          status: 200,
          payload: {
            ok: true,
            requeuedCount,
            claimedCount: 0,
            processedCount: 0,
            doneCount: 0,
            failedCount: 0,
            ranAt: new Date().toISOString()
          }
        };
      }

      const processingItems = await this.repo.loadClipperItemsForProcessing(claimedIds);
      const idSet = new Set(processingItems.map((item) => item.id));
      const pendingFailed = claimedIds.filter((id) => !idSet.has(id));
      for (const id of pendingFailed) {
        await this.repo.markClipperItemFailed({ id, message: "item_not_found_after_claim" });
      }

      let geminiResults = new Map<number, EnrichmentResult>();
      let usedFallbackForBatchFailure = false;
      let fallbackDoneCount = 0;
      let fallbackFailedCount = pendingFailed.length;
      try {
        geminiResults = await enrichWithGeminiBatch({
          items: processingItems.map((item) => ({
            id: item.id,
            term: item.term,
            hasSourceExample: Boolean(item.exampleSentenceEn),
            exampleSentenceEn: item.exampleSentenceEn
          }))
        });
      } catch (error) {
        usedFallbackForBatchFailure = true;
        for (const item of processingItems) {
          const meaningKo = await translateWithGoogle({ text: item.term, source: "en", target: "ko" });
          const exampleSentenceKo = item.exampleSentenceEn
            ? await translateWithGoogle({ text: item.exampleSentenceEn, source: "en", target: "ko" })
            : null;
          if (!meaningKo) {
            await this.repo.markClipperItemFailed({
              id: item.id,
              message: `gemini_batch_failed_fallback_failed:${error instanceof Error ? error.message : "unknown"}`
            });
            fallbackFailedCount += 1;
            continue;
          }
          await this.repo.markClipperItemDone({
            id: item.id,
            meaningKo,
            partOfSpeech: PartOfSpeech.UNKNOWN,
            exampleSentenceEn: item.exampleSentenceEn,
            exampleSentenceKo,
            exampleSource: item.exampleSentenceEn ? "SOURCE" : "NONE"
          });
          fallbackDoneCount += 1;
        }
      }

      let doneCount = 0;
      let failedCount = pendingFailed.length;

      if (!usedFallbackForBatchFailure) {
        for (const item of processingItems) {
          const output = geminiResults.get(item.id);
          if (!output) {
            await this.repo.markClipperItemFailed({ id: item.id, message: "gemini_item_missing_or_invalid" });
            failedCount += 1;
            continue;
          }
          await this.repo.markClipperItemDone({
            id: item.id,
            meaningKo: output.meaningKo,
            partOfSpeech: output.partOfSpeech,
            exampleSentenceEn: output.exampleSentenceEn,
            exampleSentenceKo: output.exampleSentenceKo,
            exampleSource: output.exampleSource
          });
          doneCount += 1;
        }
      } else {
        doneCount = fallbackDoneCount;
        failedCount = fallbackFailedCount;
      }

      return {
        ok: true,
        status: 200,
        payload: {
          ok: true,
          requeuedCount,
          claimedCount: claimedIds.length,
          processedCount: processingItems.length,
          doneCount,
          failedCount,
          ranAt: new Date().toISOString()
        }
      };
    } catch (error) {
      await captureAppError({
        route: "/api/internal/cron/clipper-enrichment",
        message: "cron_clipper_enrichment_failed",
        stack: error instanceof Error ? error.stack : undefined,
        context: { err: error instanceof Error ? error.message : String(error) }
      });
      return { ok: false, status: 500, error: "Clipper enrichment cron failed." };
    }
  }
}

function pickEligibleQueuedIds(input: {
  items: Array<{ id: number; ownerId: number; wordbookId: number; enrichmentQueuedAt: Date }>;
  minGroupSize: number;
  maxWaitSeconds: number;
  maxPick: number;
}): number[] {
  const byGroup = new Map<string, Array<{ id: number; queuedAt: number }>>();
  for (const item of input.items) {
    const key = `${item.ownerId}:${item.wordbookId}`;
    const list = byGroup.get(key) ?? [];
    list.push({ id: item.id, queuedAt: item.enrichmentQueuedAt.getTime() });
    byGroup.set(key, list);
  }

  const now = Date.now();
  const eligible: number[] = [];
  for (const list of byGroup.values()) {
    const sorted = [...list].sort((a, b) => a.queuedAt - b.queuedAt);
    const oldest = sorted[0]?.queuedAt ?? now;
    const isLargeGroup = sorted.length >= input.minGroupSize;
    const waitExpired = now - oldest >= input.maxWaitSeconds * 1000;
    if (isLargeGroup || waitExpired) {
      for (const item of sorted) {
        eligible.push(item.id);
        if (eligible.length >= input.maxPick) return eligible;
      }
    }
  }

  if (eligible.length > 0) return eligible;
  return input.items.slice(0, input.maxPick).map((item) => item.id);
}
