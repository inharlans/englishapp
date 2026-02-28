import type { ApiMode, QuizType } from "@/lib/types";
import { ensureQuizProgressTable, getQuizProgressMap } from "@/lib/quizProgress";
import { ensureWordsSeeded } from "@/lib/seedWords";
import { normalizeEn, parseWords } from "@/lib/text";
import { getMemorizeMetaById } from "@/lib/memorizeMeta";
import type { WordWithState, WordsScope } from "@/server/domain/words/contracts";
import { WordsRepository } from "@/server/domain/words/repository";
import { LastResult } from "@prisma/client";

const DEFAULT_BATCH = 1;

function parseMode(rawMode: string | null): ApiMode {
  const mode = rawMode ?? "memorize";
  const supported: ApiMode[] = ["memorize", "quiz", "listCorrect", "listWrong", "listHalf"];
  if (!supported.includes(mode as ApiMode)) return "memorize";
  return mode as ApiMode;
}

function mapByWordId<T extends { wordId: number }>(rows: T[]): Map<number, T> {
  return new Map(rows.map((row) => [row.wordId, row]));
}

export class WordsService {
  constructor(private readonly repo = new WordsRepository()) {}

  private async getWordIdsForScope(userId: number, scope: WordsScope, opts?: { skip?: number; take?: number }) {
    if (scope !== "half") return this.repo.listWordIds(opts?.skip, opts?.take);
    return this.repo.listHalfScopeWordIds(userId, opts?.skip, opts?.take);
  }

  private async getStateMaps(userId: number, wordIds: number[]) {
    if (wordIds.length === 0) {
      return { progressMap: new Map(), resultStateMap: new Map() };
    }

    const [progressRows, resultStateRows] = await Promise.all([
      this.repo.listProgressRows(userId, wordIds),
      this.repo.listResultStateRows(userId, wordIds)
    ]);

    return {
      progressMap: mapByWordId(progressRows),
      resultStateMap: mapByWordId(resultStateRows)
    };
  }

  private attachState(
    words: Array<{ id: number; en: string; ko: string }>,
    maps: {
      progressMap: Map<
        number,
        {
          wordId: number;
          correctStreak: number;
          nextReviewAt: Date | null;
          wrongActive: boolean;
          wrongRecoveryRemaining: number;
        }
      >;
      resultStateMap: Map<
        number,
        {
          wordId: number;
          everCorrect: boolean;
          everWrong: boolean;
          lastResult: LastResult | null;
          updatedAt: Date;
        }
      >;
    }
  ): WordWithState[] {
    return words.map((word) => {
      const progress = maps.progressMap.get(word.id) ?? null;
      const resultState = maps.resultStateMap.get(word.id) ?? null;
      return {
        ...word,
        progress: progress
          ? {
              correctStreak: progress.correctStreak,
              nextReviewAt: progress.nextReviewAt,
              wrongActive: progress.wrongActive,
              wrongRecoveryRemaining: progress.wrongRecoveryRemaining
            }
          : null,
        resultState: resultState
          ? {
              everCorrect: resultState.everCorrect,
              everWrong: resultState.everWrong,
              lastResult: resultState.lastResult,
              updatedAt: resultState.updatedAt
            }
          : null
      };
    });
  }

  async listWords(userId: number, rawQuery: URLSearchParams) {
    await ensureWordsSeeded();

    const mode = parseMode(rawQuery.get("mode"));
    const page = Number(rawQuery.get("page") ?? "0");
    const batch = Number(rawQuery.get("batch") ?? `${DEFAULT_BATCH}`);
    const hideCorrect = (rawQuery.get("hideCorrect") ?? "true") !== "false";
    const week = Number(rawQuery.get("week") ?? "1");
    const scope = rawQuery.get("scope");
    const forQuiz = rawQuery.get("forQuiz") === "true";
    const quizTypeRaw = rawQuery.get("quizType");
    const quizType: QuizType | null = quizTypeRaw === "MEANING" || quizTypeRaw === "WORD" ? quizTypeRaw : null;

    const now = new Date();
    const scopeType: WordsScope = scope === "half" ? "half" : null;

    const scopeCount = await this.repo.countScopeWords(userId, scopeType);
    const maxWeek = Math.max(Math.ceil(scopeCount / 50), 1);
    const safeWeek = Number.isFinite(week) && week >= 1 ? Math.min(Math.floor(week), maxWeek) : 1;

    const weekWordIds = await this.getWordIdsForScope(userId, scopeType, {
      skip: (safeWeek - 1) * 50,
      take: 50
    });
    const weekWords = await this.repo.listWordsByIds(weekWordIds);
    const weekItems = this.attachState(weekWords, await this.getStateMaps(userId, weekWordIds));

    if (mode === "quiz") {
      const priority2 = weekItems.filter((word) => {
        const reviewAt = word.progress?.nextReviewAt;
        return reviewAt !== null && reviewAt !== undefined && reviewAt <= now;
      });
      const priority3 = weekItems.filter((word) => (word.progress?.correctStreak ?? 0) === 0);
      const candidatePool = priority2.length > 0 ? priority2 : priority3.length > 0 ? priority3 : weekItems;
      const selected = candidatePool.length > 0 ? candidatePool[Math.floor(Math.random() * candidatePool.length)] : null;

      if (!selected) {
        return { word: null, maxWeek, isUserScoped: true };
      }

      const metaMap = await getMemorizeMetaById([selected.id]);
      const meta = metaMap.get(selected.id);
      return {
        word: {
          ...selected,
          memorizeWeek: meta?.memorizeWeek,
          memorizePosition: meta?.memorizePosition
        },
        maxWeek,
        isUserScoped: true
      };
    }

    if (mode === "listCorrect" || mode === "listWrong" || mode === "listHalf") {
      const ids = await this.repo.listResultStateWordIdsForMode(userId, mode);
      const words = await this.repo.listWordsByIds(ids);
      const maps = await this.getStateMaps(userId, ids);
      const metaMap = await getMemorizeMetaById(words.map((word) => word.id));

      return {
        words: this.attachState(words, maps).map((item) => ({
          ...item,
          memorizeWeek: metaMap.get(item.id)?.memorizeWeek,
          memorizePosition: metaMap.get(item.id)?.memorizePosition
        })),
        total: words.length,
        page: 0,
        batch: words.length || 1,
        maxWeek,
        isUserScoped: true
      };
    }

    let filtered: WordWithState[] = weekItems;
    if (mode === "memorize") {
      filtered = hideCorrect ? weekItems.filter((word) => (word.progress?.correctStreak ?? 0) < 1) : weekItems;

      if (forQuiz && quizType) {
        const prisma = this.repo.getPrismaClient();
        await ensureQuizProgressTable(prisma);
        const progressMap = await getQuizProgressMap(
          prisma,
          userId,
          filtered.map((word) => word.id)
        );

        const parseDate = (value: Date | string | null | undefined) => {
          if (!value) return null;
          return value instanceof Date ? value : new Date(value);
        };

        filtered = filtered.filter((word) => {
          const modeProgress = progressMap.get(word.id);
          if (quizType === "MEANING") {
            const streak = modeProgress?.meaningCorrectStreak ?? 0;
            const reviewAt = parseDate(modeProgress?.meaningNextReviewAt);
            return streak <= 0 || reviewAt === null || reviewAt <= now;
          }
          const streak = modeProgress?.wordCorrectStreak ?? 0;
          const reviewAt = parseDate(modeProgress?.wordNextReviewAt);
          return streak <= 0 || reviewAt === null || reviewAt <= now;
        });
      }
    }

    const safeBatch =
      mode === "memorize"
        ? Math.min(Math.max(Number.isFinite(batch) ? Math.floor(batch) : DEFAULT_BATCH, 1), 50)
        : batch === 5 || batch === 50
          ? batch
          : 1;
    const safePage = Number.isFinite(page) && page >= 0 ? Math.floor(page) : 0;
    const start = safePage * safeBatch;
    const items = filtered.slice(start, start + safeBatch);
    const metaMap = await getMemorizeMetaById(items.map((word) => word.id));

    return {
      words: items.map((item) => ({
        ...item,
        memorizeWeek: metaMap.get(item.id)?.memorizeWeek,
        memorizePosition: metaMap.get(item.id)?.memorizePosition
      })),
      total: filtered.length,
      page: safePage,
      batch: safeBatch,
      maxWeek,
      isUserScoped: true
    };
  }

  async importWords(rawText: string) {
    const parsed = parseWords(rawText);
    if (parsed.rows.length === 0) {
      return {
        importedCount: 0,
        skippedCount: 0,
        delimiter: parsed.delimiter,
        message: "No valid rows found."
      };
    }

    const existing = await this.repo.listAllWordEn();
    const existingNormalized = new Set(existing.map((word) => normalizeEn(word.en)));

    let importedCount = 0;
    let skippedCount = 0;
    for (const row of parsed.rows) {
      if (existingNormalized.has(normalizeEn(row.en))) {
        skippedCount += 1;
        continue;
      }
      const created = await this.repo.createWord({ en: row.en, ko: row.ko });
      existingNormalized.add(normalizeEn(created.en));
      importedCount += 1;
    }

    return { importedCount, skippedCount, delimiter: parsed.delimiter };
  }

  async updateWordKo(id: number, ko: string) {
    return this.repo.updateWordKo(id, ko);
  }
}
