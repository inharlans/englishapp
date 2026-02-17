import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { canAccessWordbookForStudy } from "@/lib/wordbookAccess";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

type QuizMode = "MEANING" | "WORD";

function parseMode(raw: string | null): QuizMode {
  return raw === "WORD" ? "WORD" : "MEANING";
}

function parsePositiveInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

type QuizRow = {
  id: number;
  term: string;
  meaning: string;
  example: string | null;
  exampleMeaning: string | null;
};

async function pickRandomItem(input: {
  wordbookId: number;
  userId: number;
  partStart: number;
  partEndExclusive: number;
  filterSql: Prisma.Sql;
}): Promise<QuizRow | null> {
  const rows = await prisma.$queryRaw<QuizRow[]>(
    Prisma.sql`
      SELECT
        wi."id",
        wi."term",
        wi."meaning",
        wi."example",
        wi."exampleMeaning"
      FROM "WordbookItem" wi
      LEFT JOIN "WordbookStudyItemState" ws
        ON ws."itemId" = wi."id"
       AND ws."wordbookId" = wi."wordbookId"
       AND ws."userId" = ${input.userId}
      WHERE wi."wordbookId" = ${input.wordbookId}
        AND wi."position" >= ${input.partStart}
        AND wi."position" < ${input.partEndExclusive}
        AND (${input.filterSql})
      ORDER BY random()
      LIMIT 1
    `
  );
  return rows[0] ?? null;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idRaw } = await ctx.params;
  const wordbookId = parseId(idRaw);
  if (!wordbookId) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const allowed = await canAccessWordbookForStudy({ userId: user.id, wordbookId, userPlan: user.plan });
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const mode = parseMode(searchParams.get("mode"));
  const partSize = parsePositiveInt(searchParams.get("partSize"), 30, 1, 200);
  const requestedPartIndex = parsePositiveInt(searchParams.get("partIndex"), 1, 1, 100_000);

  const totalItems = await prisma.wordbookItem.count({ where: { wordbookId } });
  if (totalItems === 0) {
    return NextResponse.json(
      { item: null, mode, totalItems: 0, partSize, partIndex: 1, partCount: 1, partItemCount: 0 },
      { status: 200 }
    );
  }

  const partCount = Math.max(1, Math.ceil(totalItems / partSize));
  const partIndex = Math.min(Math.max(requestedPartIndex, 1), partCount);
  const partStart = (partIndex - 1) * partSize;
  const partEndExclusive = partStart + partSize;
  const partItemCount = Math.max(0, Math.min(partSize, totalItems - partStart));

  const state = await prisma.wordbookStudyState.findUnique({
    where: { userId_wordbookId: { userId: user.id, wordbookId } },
    select: { meaningQuestionCount: true, wordQuestionCount: true }
  });
  const questionCount = mode === "MEANING" ? (state?.meaningQuestionCount ?? 0) : (state?.wordQuestionCount ?? 0);
  const now = new Date();

  const dueFilter =
    mode === "MEANING"
      ? Prisma.sql`ws."meaningCorrectStreak" > 0 AND ws."meaningNextReviewAt" IS NOT NULL AND ws."meaningNextReviewAt" <= ${now}`
      : Prisma.sql`ws."wordCorrectStreak" > 0 AND ws."wordNextReviewAt" IS NOT NULL AND ws."wordNextReviewAt" <= ${now}`;

  const wrongReadyFilter =
    mode === "MEANING"
      ? Prisma.sql`ws."status" = 'WRONG' AND ws."meaningWrongRequeueAt" IS NOT NULL AND ws."meaningWrongRequeueAt" <= ${questionCount}`
      : Prisma.sql`ws."status" = 'WRONG' AND ws."wordWrongRequeueAt" IS NOT NULL AND ws."wordWrongRequeueAt" <= ${questionCount}`;

  const unseen = await pickRandomItem({
    wordbookId,
    userId: user.id,
    partStart,
    partEndExclusive,
    filterSql: Prisma.sql`ws."itemId" IS NULL`
  });

  const due = unseen
    ? null
    : await pickRandomItem({
        wordbookId,
        userId: user.id,
        partStart,
        partEndExclusive,
        filterSql: dueFilter
      });

  const wrongReady = unseen || due
    ? null
    : await pickRandomItem({
        wordbookId,
        userId: user.id,
        partStart,
        partEndExclusive,
        filterSql: wrongReadyFilter
      });

  const fallbackNonWrong = unseen || due || wrongReady
    ? null
    : await pickRandomItem({
        wordbookId,
        userId: user.id,
        partStart,
        partEndExclusive,
        filterSql: Prisma.sql`ws."itemId" IS NULL OR ws."status" <> 'WRONG'`
      });

  // End-of-cycle recovery: if less than 10 remain before requeue, bring wrong items back at quiz tail.
  const wrongAtEnd = unseen || due || wrongReady || fallbackNonWrong
    ? null
    : await pickRandomItem({
        wordbookId,
        userId: user.id,
        partStart,
        partEndExclusive,
        filterSql: Prisma.sql`ws."status" = 'WRONG'`
      });

  return NextResponse.json(
    {
      item: unseen ?? due ?? wrongReady ?? fallbackNonWrong ?? wrongAtEnd ?? null,
      mode,
      totalItems,
      partSize,
      partIndex,
      partCount,
      partItemCount
    },
    { status: 200 }
  );
}

