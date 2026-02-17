import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import {
  getStudyPartStatsFromCache,
  makeStudyPartStatsCacheKey,
  setStudyPartStatsCache
} from "@/lib/studyPartStatsCache";
import { canAccessWordbookForStudy } from "@/lib/wordbookAccess";

type StudyView = "memorize" | "listCorrect" | "listWrong" | "listHalf";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function parseIntParam(raw: string | null, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function parseBoolParam(raw: string | null, fallback = false): boolean {
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return fallback;
}

function parseView(raw: string | null): StudyView {
  if (raw === "listCorrect" || raw === "listWrong" || raw === "listHalf" || raw === "memorize") {
    return raw;
  }
  return "memorize";
}

function buildItemWhere(input: {
  wordbookId: number;
  userId: number;
  view: StudyView;
  hideCorrect: boolean;
  q: string;
  partStart: number | null;
  partEndExclusive: number | null;
}): Prisma.WordbookItemWhereInput {
  const where: Prisma.WordbookItemWhereInput = {
    wordbookId: input.wordbookId
  };

  if (input.partStart !== null && input.partEndExclusive !== null) {
    where.position = { gte: input.partStart, lt: input.partEndExclusive };
  }

  if (input.q) {
    where.OR = [
      { term: { contains: input.q, mode: "insensitive" } },
      { meaning: { contains: input.q, mode: "insensitive" } },
      { pronunciation: { contains: input.q, mode: "insensitive" } },
      { example: { contains: input.q, mode: "insensitive" } },
      { exampleMeaning: { contains: input.q, mode: "insensitive" } }
    ];
  }

  if (input.view === "listCorrect") {
    where.studyItemStates = {
      some: { userId: input.userId, wordbookId: input.wordbookId, status: "CORRECT" }
    };
  } else if (input.view === "listWrong") {
    where.studyItemStates = {
      some: { userId: input.userId, wordbookId: input.wordbookId, status: "WRONG" }
    };
  } else if (input.view === "listHalf") {
    where.studyItemStates = {
      some: {
        userId: input.userId,
        wordbookId: input.wordbookId,
        everCorrect: true,
        everWrong: true
      }
    };
  } else if (input.hideCorrect) {
    where.NOT = {
      studyItemStates: {
        some: { userId: input.userId, wordbookId: input.wordbookId, status: "CORRECT" }
      }
    };
  }

  return where;
}

function buildMatchSql(input: {
  view: StudyView;
  hideCorrect: boolean;
  qLike: string | null;
}): Prisma.Sql {
  const qSql = input.qLike
    ? Prisma.sql`(
      wi."term" ILIKE ${input.qLike}
      OR wi."meaning" ILIKE ${input.qLike}
      OR COALESCE(wi."pronunciation", '') ILIKE ${input.qLike}
      OR COALESCE(wi."example", '') ILIKE ${input.qLike}
      OR COALESCE(wi."exampleMeaning", '') ILIKE ${input.qLike}
    )`
    : Prisma.sql`TRUE`;

  let viewSql: Prisma.Sql = Prisma.sql`TRUE`;
  if (input.view === "listCorrect") {
    viewSql = Prisma.sql`ws."status" = 'CORRECT'`;
  } else if (input.view === "listWrong") {
    viewSql = Prisma.sql`ws."status" = 'WRONG'`;
  } else if (input.view === "listHalf") {
    viewSql = Prisma.sql`ws."everCorrect" = TRUE AND ws."everWrong" = TRUE`;
  } else if (input.hideCorrect) {
    viewSql = Prisma.sql`ws."status" IS NULL OR ws."status" <> 'CORRECT'`;
  }

  return Prisma.sql`${viewSql} AND ${qSql}`;
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

  const sp = new URL(req.url).searchParams;
  const view = parseView(sp.get("view"));
  const page = parseIntParam(sp.get("page"), 0, 0, 100_000);
  const take = parseIntParam(sp.get("take"), 30, 1, 200);
  const q = (sp.get("q") ?? "").trim();
  const hideCorrect = parseBoolParam(sp.get("hideCorrect"), false);
  const partSizeRaw = sp.get("partSize");
  const partSize = partSizeRaw ? parseIntParam(partSizeRaw, 30, 1, 200) : null;
  const requestedPartIndex = parseIntParam(sp.get("partIndex"), 1, 1, 100_000);

  const [wordbook, state, totalItems] = await Promise.all([
    prisma.wordbook.findUnique({
      where: { id: wordbookId },
      select: { id: true, title: true, description: true, fromLang: true, toLang: true }
    }),
    prisma.wordbookStudyState.findUnique({
      where: { userId_wordbookId: { userId: user.id, wordbookId } },
      select: { studiedCount: true, correctCount: true, wrongCount: true, updatedAt: true }
    }),
    prisma.wordbookItem.count({ where: { wordbookId } })
  ]);

  if (!wordbook) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const partCount = partSize ? Math.max(1, Math.ceil(totalItems / partSize)) : 1;
  const partIndex = partSize ? Math.min(Math.max(requestedPartIndex, 1), partCount) : 1;
  const partStart = partSize ? (partIndex - 1) * partSize : null;
  const partEndExclusive = partSize ? partStart! + partSize : null;
  const partItemCount = partSize
    ? Math.max(0, Math.min(partSize, totalItems - partStart!))
    : totalItems;

  const where = buildItemWhere({
    wordbookId,
    userId: user.id,
    view,
    hideCorrect,
    q,
    partStart,
    partEndExclusive
  });

  const [totalFiltered, items] = await Promise.all([
    prisma.wordbookItem.count({ where }),
    prisma.wordbookItem.findMany({
      where,
      orderBy: [{ position: "asc" }, { id: "asc" }],
      skip: page * take,
      take,
      select: {
        id: true,
        term: true,
        meaning: true,
        pronunciation: true,
        example: true,
        exampleMeaning: true,
        position: true,
        studyItemStates: {
          where: { userId: user.id, wordbookId },
          take: 1,
          select: {
            itemId: true,
            status: true,
            streak: true,
            everCorrect: true,
            everWrong: true,
            lastResult: true,
            updatedAt: true
          }
        }
      }
    })
  ]);

  let partStats: Array<{ partIndex: number; totalInPart: number; matchedCount: number }> = [];
  if (partSize) {
    const cacheKey = makeStudyPartStatsCacheKey({
      userId: user.id,
      wordbookId,
      view,
      hideCorrect,
      q,
      partSize
    });
    const cached = getStudyPartStatsFromCache(cacheKey);
    if (cached) {
      partStats = cached;
    } else {
      const qLike = q ? `%${q.replace(/[%_]/g, "\\$&")}%` : null;
      const matchSql = buildMatchSql({ view, hideCorrect, qLike });
      const rows = await prisma.$queryRaw<Array<{ partIndex: number; totalInPart: number; matchedCount: number }>>(
        Prisma.sql`
          SELECT
            ((wi."position" / ${partSize})::int + 1) AS "partIndex",
            COUNT(*)::int AS "totalInPart",
            COUNT(*) FILTER (WHERE ${matchSql})::int AS "matchedCount"
          FROM "WordbookItem" wi
          LEFT JOIN "WordbookStudyItemState" ws
            ON ws."itemId" = wi."id"
           AND ws."wordbookId" = wi."wordbookId"
           AND ws."userId" = ${user.id}
          WHERE wi."wordbookId" = ${wordbookId}
          GROUP BY "partIndex"
          ORDER BY "partIndex" ASC
        `
      );
      partStats = rows;
      setStudyPartStatsCache(cacheKey, rows);
    }
  }

  return NextResponse.json(
    {
      wordbook,
      studyState: state ?? {
        studiedCount: 0,
        correctCount: 0,
        wrongCount: 0,
        updatedAt: null
      },
      items: items.map((it) => ({
        id: it.id,
        term: it.term,
        meaning: it.meaning,
        pronunciation: it.pronunciation,
        example: it.example,
        exampleMeaning: it.exampleMeaning,
        position: it.position,
        itemState: it.studyItemStates[0] ?? null
      })),
      paging: {
        page,
        take,
        totalFiltered,
        totalItems,
        partSize,
        partIndex,
        partCount,
        partItemCount,
        partStats
      }
    },
    { status: 200 }
  );
}

