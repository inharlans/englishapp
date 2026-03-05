import { PartOfSpeech } from "@prisma/client";

import { enrichWithGeminiBatch, translateWithGoogle, type EnrichmentResult } from "@/lib/clipperEnrichment";
import { logJson } from "@/lib/logger";
import { captureAppError } from "@/lib/observability";
import {
  CLIPPER_ALERT_POLICY_VERSION,
  evaluateClipperAlerts
} from "@/server/domain/internal/clipperAlertPolicy";
import {
  getCachedClipperMetrics,
  getClipperMetricsCacheMode,
  getClipperMetricsCacheTtlSec,
  setCachedClipperMetrics
} from "@/server/domain/internal/clipperMetricsCache";
import type {
  InternalCronServiceResult,
  InternalMetricsResult,
  InternalMetricsServiceResult
} from "@/server/domain/internal/contracts";
import {
  classifyEnrichmentError,
  createReasonCounts,
  formatEnrichmentReason,
  parseEnrichmentReason,
  type EnrichmentReasonCode
} from "@/server/domain/internal/enrichmentReason";
import { InternalRepository } from "@/server/domain/internal/repository";

function isAuthorized(authorizationHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (authorizationHeader ?? "") === `Bearer ${secret}`;
}

export class InternalService {
  constructor(private readonly repo = new InternalRepository()) {}

  async getClipperMetrics(input: {
    authorizationHeader: string | null;
    window: "1h" | "24h" | "7d";
    includeSeries: boolean;
    refresh: boolean;
    trustedInternal?: boolean;
  }): Promise<InternalMetricsServiceResult> {
    if (!input.trustedInternal && !isAuthorized(input.authorizationHeader)) {
      return { ok: false, status: 403, error: "Forbidden." };
    }

    const hoursByWindow: Record<"1h" | "24h" | "7d", number> = {
      "1h": 1,
      "24h": 24,
      "7d": 24 * 7
    };
    const hours = hoursByWindow[input.window];
    if (!hours) {
      return { ok: false, status: 400, error: "Invalid window." };
    }

    const cacheMode = getClipperMetricsCacheMode();
    const cacheTtlSec = getClipperMetricsCacheTtlSec();
    const cacheKey = `clipper-metrics:${input.window}:${input.includeSeries ? "series" : "no-series"}`;
    if (!input.refresh && cacheTtlSec > 0) {
      const cached = getCachedClipperMetrics<InternalMetricsResult["payload"]>(cacheKey);
      if (cached) {
        return {
          ok: true,
          status: 200,
          payload: {
            ...cached,
            cache: {
              mode: cacheMode,
              hit: true,
              ttlSec: cacheTtlSec
            }
          }
        };
      }
    }

    try {
      const nowAt = new Date();
      const windowEndHour = floorHour(nowAt);
      const since = new Date(windowEndHour.getTime() - hours * 60 * 60 * 1000);
      const previousSince = new Date(since.getTime() - hours * 60 * 60 * 1000);
      const maxAttempts = Math.max(
        1,
        Number.parseInt(process.env.CLIPPER_ENRICH_MAX_ATTEMPTS ?? "3", 10) || 3
      );

      const [
        backlog,
        waitMs,
        processMs,
        completion,
        failureReasons,
        retry,
        terminalFailed,
        ux,
        partialDoneRate,
        cost,
        cronCalls,
        rateLimitFailed,
        failedCurr,
        failedPrev,
        hourly
      ] = await Promise.all([
        this.repo.getClipperBacklogCounts(),
        this.repo.getClipperWaitPercentiles(),
        this.repo.getClipperProcessPercentiles({ since, end: windowEndHour }),
        this.repo.getClipperCompletionStats({ since, end: windowEndHour }),
        this.repo.getClipperFailureReasons({ since, end: windowEndHour }),
        this.repo.getClipperRetryStats({ since, end: windowEndHour }),
        this.repo.getClipperTerminalFailed({ maxAttempts, since, end: windowEndHour }),
        this.repo.getClipperUxLatencyPercentile({ since, end: windowEndHour }),
        this.repo.getClipperPartialDoneRate({ since, end: windowEndHour }),
        this.repo.getClipperCostEstimate({ since, end: windowEndHour }),
        this.repo.getClipperCronCallStats({ since, end: windowEndHour }),
        this.repo.countClipperFailedByReasonSince({ since, end: windowEndHour, reasonCode: "RATE_LIMIT" }),
        this.repo.countClipperFailedBetween({ start: since, end: windowEndHour }),
        this.repo.countClipperFailedBetween({ start: previousSince, end: since }),
        input.includeSeries
          ? this.repo.getClipperHourlySeries({ since, end: windowEndHour })
          : Promise.resolve([])
      ]);

      const normalizedReasonMap = new Map<string, number>();
      for (const row of failureReasons) {
        const normalizedCode = parseEnrichmentReason(row.reasonCode);
        normalizedReasonMap.set(normalizedCode, (normalizedReasonMap.get(normalizedCode) ?? 0) + row.count);
      }
      const normalizedReasons = Array.from(normalizedReasonMap.entries())
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => b.count - a.count);
      const topFailures = normalizedReasons.slice(0, 5);
      const topFailuresOthersCount = normalizedReasons.slice(5).reduce((sum, row) => sum + row.count, 0);
      const elapsedHours = Math.max(1 / 60, hours);
      const throughputPerHour = Number((completion.doneCount / elapsedHours).toFixed(2));
      const failedDelta = failedCurr - failedPrev;
      const failedPct = failedPrev > 0 ? Number((failedDelta / failedPrev).toFixed(4)) : null;
      const filledHourly = input.includeSeries
        ? fillHourlyBuckets({
            now: windowEndHour,
            bucketHours: hours,
            rows: hourly
          })
        : [];
      const alerts = evaluateClipperAlerts({
        queue: {
          queued: backlog.queued,
          processing: backlog.processing,
          waitMs,
          processMs,
          throughputPerHour
        },
        quality: {
          doneCount: completion.doneCount,
          failedCount: completion.failedCount,
          successRate: completion.successRate,
          failureRate: completion.failureRate,
          retryRate: retry.retryRate,
          retrySuccessRate: retry.retrySuccessRate,
          terminalFailed,
          partialDoneRate
        },
        rateLimitFailed,
        ux: {
          doneLatencyMs: {
            p95: ux.p95
          }
        }
      });

      const payload: InternalMetricsResult["payload"] = {
        ok: true,
        window: input.window,
        generatedAt: new Date().toISOString(),
        cache: {
          mode: cacheMode,
          hit: false,
          ttlSec: cacheTtlSec
        },
        queue: {
          queued: backlog.queued,
          processing: backlog.processing,
          waitMs,
          processMs,
          throughputPerHour
        },
        quality: {
          doneCount: completion.doneCount,
          failedCount: completion.failedCount,
          successRate: completion.successRate,
          failureRate: completion.failureRate,
          retryRate: retry.retryRate,
          retrySuccessRate: retry.retrySuccessRate,
          terminalFailed,
          partialDoneRate
        },
        failureReasons: normalizedReasons,
        topFailures,
        topFailuresOthersCount,
        alerts,
        cost: {
          cronCallCount: cronCalls.calls,
          charEstimate: cost.charEstimate,
          tokenEstimate: cost.tokenEstimate
        },
        trend: {
          metric: "failedCount",
          curr: failedCurr,
          prev: failedPrev,
          delta: failedDelta,
          pct: failedPct
        },
        policy: {
          version: CLIPPER_ALERT_POLICY_VERSION
        },
        ux: {
          doneLatencyMs: {
            p95: ux.p95
          }
        },
        series: {
          hourly: filledHourly
        }
      };

      if (cacheTtlSec > 0) {
        setCachedClipperMetrics(cacheKey, payload, cacheTtlSec);
      }

      return {
        ok: true,
        status: 200,
        payload
      };
    } catch (error) {
      await captureAppError({
        route: "/api/internal/ops/clipper-metrics",
        message: "internal_clipper_metrics_failed",
        stack: error instanceof Error ? error.stack : undefined,
        context: { err: error instanceof Error ? error.message : String(error) }
      });
      return { ok: false, status: 500, error: "Clipper metrics load failed." };
    }
  }

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
    const maxPerOwnerPerRun = Math.max(
      0,
      Number.parseInt(process.env.CLIPPER_ENRICH_MAX_PER_OWNER_PER_RUN ?? "0", 10) || 0
    );
    const runStartedAt = Date.now();

    try {
      const reasonCounts = createReasonCounts();
      const failedAttempts: number[] = [];
      const incrementReason = (code: EnrichmentReasonCode) => {
        reasonCounts[code] += 1;
      };
      const markFailedWithReason = async (input: {
        id: number;
        code: EnrichmentReasonCode;
        detail?: string;
        attempt?: number;
      }) => {
        await this.repo.markClipperItemFailed({
          id: input.id,
          message: formatEnrichmentReason(input.code, input.detail)
        });
        await captureAppError({
          level: "warn",
          route: "/api/internal/cron/clipper-enrichment",
          message: "cron_clipper_enrichment_item_failed",
          context: {
            itemId: input.id,
            attempt: input.attempt ?? null,
            maxAttempts,
            reasonCode: input.code,
            detail: input.detail ?? null
          }
        });
        if (typeof input.attempt === "number" && Number.isFinite(input.attempt)) {
          failedAttempts.push(input.attempt);
        }
        incrementReason(input.code);
      };

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
        maxPick: queuedPool.length
      });
      const pickedIds = applyOwnerRunQuota({
        ids: eligibleIds,
        ownerIdByItemId: new Map(queuedPool.map((item) => [item.id, item.ownerId])),
        maxPerOwnerPerRun,
        maxPick: batchSize
      });
      const claimedIds = await this.repo.claimQueuedClipperItemsByIds(pickedIds);
      const skippedCount = Math.max(0, pickedIds.length - claimedIds.length);
      if (claimedIds.length === 0) {
        const durationMs = Date.now() - runStartedAt;
        logJson("info", "cron_clipper_enrichment_run_summary", {
          picked: 0,
          succeeded: 0,
          failed: 0,
          skipped: skippedCount,
          durationMs,
          requeuedCount,
          reasonCounts
        });
        return {
          ok: true,
          status: 200,
          payload: {
            ok: true,
            picked: 0,
            succeeded: 0,
            failed: 0,
            skipped: skippedCount,
            durationMs,
            requeuedCount,
            claimedCount: 0,
            processedCount: 0,
            doneCount: 0,
            failedCount: 0,
            reasonCounts,
            ranAt: new Date().toISOString()
          }
        };
      }

      const processingItems = await this.repo.loadClipperItemsForProcessing(claimedIds);
      const idSet = new Set(processingItems.map((item) => item.id));
      const pendingFailed = claimedIds.filter((id) => !idSet.has(id));
      const attemptsById = new Map<number, number>(queuedPool.map((item) => [item.id, item.enrichmentAttempts + 1]));
      for (const id of pendingFailed) {
        await markFailedWithReason({
          id,
          code: "ITEM_NOT_FOUND_AFTER_CLAIM",
          attempt: attemptsById.get(id)
        });
      }

      let geminiResults = new Map<number, EnrichmentResult>();
      let usedFallbackForBatchFailure = false;
      let fallbackDoneCount = 0;
      let fallbackFailedCount = 0;
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
        const batchReason = classifyEnrichmentError(error);
        await captureAppError({
          level: "warn",
          route: "/api/internal/cron/clipper-enrichment",
          message: "cron_clipper_enrichment_batch_failed",
          context: {
            reasonCode: batchReason,
            err: error instanceof Error ? error.message : String(error),
            itemCount: processingItems.length
          }
        });
        usedFallbackForBatchFailure = true;
        for (const item of processingItems) {
          const attempt = attemptsById.get(item.id);
          try {
            const meaningKo = await translateWithGoogle({ text: item.term, source: "en", target: "ko" });
            const exampleSentenceKo = item.exampleSentenceEn
              ? await translateWithGoogle({ text: item.exampleSentenceEn, source: "en", target: "ko" })
              : null;
            if (!meaningKo) {
              await markFailedWithReason({
                id: item.id,
                code: "GOOGLE_TRANSLATE_FALLBACK_EMPTY",
                detail: "meaningKo_empty",
                attempt
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
          } catch (fallbackError) {
            await markFailedWithReason({
              id: item.id,
              code: "BATCH_FALLBACK_FAILED",
              detail: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
              attempt
            });
            fallbackFailedCount += 1;
          }
        }
      }

      let doneCount = 0;
      let failedCount = pendingFailed.length;

      if (!usedFallbackForBatchFailure) {
        for (const item of processingItems) {
          const output = geminiResults.get(item.id);
          if (!output) {
            await markFailedWithReason({
              id: item.id,
              code: "ITEM_MISSING_OR_INVALID",
              attempt: attemptsById.get(item.id)
            });
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
        failedCount += fallbackFailedCount;
      }

      const durationMs = Date.now() - runStartedAt;
      const terminalFailedCount = failedAttempts.filter((attempt) => attempt >= maxAttempts).length;
      const succeeded = doneCount;
      const failed = failedCount;
      const picked = claimedIds.length;
      logJson("info", "cron_clipper_enrichment_run_summary", {
        picked,
        succeeded,
        failed,
        skipped: skippedCount,
        durationMs,
        requeuedCount,
        terminalFailedCount,
        reasonCounts
      });

      return {
        ok: true,
        status: 200,
        payload: {
          ok: true,
          picked,
          succeeded,
          failed,
          skipped: skippedCount,
          durationMs,
          terminalFailedCount,
          requeuedCount,
          claimedCount: claimedIds.length,
          processedCount: processingItems.length,
          doneCount,
          failedCount,
          reasonCounts,
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

function floorHour(date: Date): Date {
  const next = new Date(date);
  next.setUTCMinutes(0, 0, 0);
  return next;
}

function fillHourlyBuckets(input: {
  now: Date;
  bucketHours: number;
  rows: Array<{ hour: string; doneCount: number; failedCount: number }>;
}): Array<{ hour: string; doneCount: number; failedCount: number }> {
  const sorted = [...input.rows].sort((a, b) => a.hour.localeCompare(b.hour));
  const byHour = new Map<string, { doneCount: number; failedCount: number }>();
  for (const row of sorted) {
    byHour.set(floorHour(new Date(row.hour)).toISOString(), {
      doneCount: row.doneCount,
      failedCount: row.failedCount
    });
  }

  const end = floorHour(input.now);
  const bucketCount = Math.max(1, input.bucketHours);
  const start = new Date(end.getTime() - bucketCount * 60 * 60 * 1000);
  const out: Array<{ hour: string; doneCount: number; failedCount: number }> = [];
  for (let ts = start.getTime(); ts < end.getTime(); ts += 60 * 60 * 1000) {
    const hourIso = new Date(ts).toISOString();
    const row = byHour.get(hourIso);
    out.push({
      hour: hourIso,
      doneCount: row?.doneCount ?? 0,
      failedCount: row?.failedCount ?? 0
    });
  }
  return out;
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

function applyOwnerRunQuota(input: {
  ids: number[];
  ownerIdByItemId: Map<number, number>;
  maxPerOwnerPerRun: number;
  maxPick: number;
}): number[] {
  if (input.maxPerOwnerPerRun <= 0) return input.ids.slice(0, input.maxPick);

  const ownerPicked = new Map<number, number>();
  const picked: number[] = [];
  for (const id of input.ids) {
    if (picked.length >= input.maxPick) break;
    const ownerId = input.ownerIdByItemId.get(id);
    if (ownerId === undefined) continue;
    const current = ownerPicked.get(ownerId) ?? 0;
    if (current >= input.maxPerOwnerPerRun) continue;
    ownerPicked.set(ownerId, current + 1);
    picked.push(id);
  }
  return picked;
}
