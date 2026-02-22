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
}
