import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

import type { QuizType } from "@/lib/types";

type DbClient = Pick<PrismaClient, "$executeRaw" | "$queryRaw">;

type QuizProgressRow = {
  wordId: number;
  meaningCorrectStreak: number;
  meaningNextReviewAt: Date | string | null;
  wordCorrectStreak: number;
  wordNextReviewAt: Date | string | null;
};

export async function ensureQuizProgressTable(db: DbClient) {
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS "QuizProgress" (
      "wordId" INTEGER NOT NULL PRIMARY KEY,
      "meaningCorrectStreak" INTEGER NOT NULL DEFAULT 0,
      "meaningNextReviewAt" DATETIME,
      "meaningLastResult" TEXT,
      "wordCorrectStreak" INTEGER NOT NULL DEFAULT 0,
      "wordNextReviewAt" DATETIME,
      "wordLastResult" TEXT,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "QuizProgress_wordId_fkey"
        FOREIGN KEY ("wordId") REFERENCES "Word" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    );
  `;
}

export async function getQuizProgressByWordId(
  db: DbClient,
  wordId: number
): Promise<QuizProgressRow | null> {
  const rows = await db.$queryRaw<QuizProgressRow[]>`
    SELECT
      "wordId",
      "meaningCorrectStreak",
      "meaningNextReviewAt",
      "wordCorrectStreak",
      "wordNextReviewAt"
    FROM "QuizProgress"
    WHERE "wordId" = ${wordId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function upsertQuizProgress(
  db: DbClient,
  input: {
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
        "wordId",
        "meaningCorrectStreak",
        "wordCorrectStreak",
        "updatedAt"
      )
      VALUES (${input.wordId}, 0, 0, CURRENT_TIMESTAMP)
      ON CONFLICT("wordId") DO NOTHING;
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
        WHERE "wordId" = ${input.wordId}
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
      WHERE "wordId" = ${input.wordId}
    `
  );
}

export async function getQuizProgressMap(
  db: DbClient,
  wordIds: number[]
): Promise<Map<number, QuizProgressRow>> {
  if (wordIds.length === 0) {
    return new Map();
  }

  const idList = Prisma.join(wordIds);
  const rows = await db.$queryRaw<QuizProgressRow[]>(
    Prisma.sql`
      SELECT
        "wordId",
        "meaningCorrectStreak",
        "meaningNextReviewAt",
        "wordCorrectStreak",
        "wordNextReviewAt"
      FROM "QuizProgress"
      WHERE "wordId" IN (${idList})
    `
  );

  return new Map(rows.map((row) => [row.wordId, row]));
}
