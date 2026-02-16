import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

import type { QuizType } from "@/lib/types";

type DbClient = Pick<PrismaClient, "$executeRaw" | "$queryRaw">;

type QuizProgressRow = {
  userId: number;
  wordId: number;
  meaningCorrectStreak: number;
  meaningNextReviewAt: Date | string | null;
  wordCorrectStreak: number;
  wordNextReviewAt: Date | string | null;
};

export async function ensureQuizProgressTable(db: DbClient) {
  // Table is managed by Prisma migrations in deployment environments.
  void db;
}

export async function getQuizProgressByWordId(
  db: DbClient,
  userId: number,
  wordId: number
): Promise<QuizProgressRow | null> {
  const rows = await db.$queryRaw<QuizProgressRow[]>`
    SELECT
      "userId",
      "wordId",
      "meaningCorrectStreak",
      "meaningNextReviewAt",
      "wordCorrectStreak",
      "wordNextReviewAt"
    FROM "QuizProgress"
    WHERE "userId" = ${userId} AND "wordId" = ${wordId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function upsertQuizProgress(
  db: DbClient,
  input: {
    userId: number;
    wordId: number;
    quizType: QuizType;
    correct: boolean;
    nextStreak: number;
    nextReviewAt: Date | null;
  }
) {
  const resultValue = input.correct ? "CORRECT" : "WRONG";

  await db.$executeRaw(
    Prisma.sql`
      INSERT INTO "QuizProgress" (
        "userId",
        "wordId",
        "meaningCorrectStreak",
        "wordCorrectStreak",
        "updatedAt"
      )
      VALUES (${input.userId}, ${input.wordId}, 0, 0, CURRENT_TIMESTAMP)
      ON CONFLICT("userId", "wordId") DO NOTHING;
    `
  );

  if (input.quizType === "MEANING") {
    await db.$executeRaw(
      Prisma.sql`
        UPDATE "QuizProgress"
        SET
          "meaningCorrectStreak" = ${input.nextStreak},
          "meaningNextReviewAt" = ${input.nextReviewAt},
          "meaningLastResult" = ${resultValue},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = ${input.userId} AND "wordId" = ${input.wordId}
      `
    );
    return;
  }

  await db.$executeRaw(
    Prisma.sql`
      UPDATE "QuizProgress"
      SET
        "wordCorrectStreak" = ${input.nextStreak},
        "wordNextReviewAt" = ${input.nextReviewAt},
        "wordLastResult" = ${resultValue},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "userId" = ${input.userId} AND "wordId" = ${input.wordId}
    `
  );
}

export async function getQuizProgressMap(
  db: DbClient,
  userId: number,
  wordIds: number[]
): Promise<Map<number, QuizProgressRow>> {
  if (wordIds.length === 0) {
    return new Map();
  }

  const idList = Prisma.join(wordIds);
  const rows = await db.$queryRaw<QuizProgressRow[]>(
    Prisma.sql`
      SELECT
        "userId",
        "wordId",
        "meaningCorrectStreak",
        "meaningNextReviewAt",
        "wordCorrectStreak",
        "wordNextReviewAt"
      FROM "QuizProgress"
      WHERE "userId" = ${userId} AND "wordId" IN (${idList})
    `
  );

  return new Map(rows.map((row) => [row.wordId, row]));
}
