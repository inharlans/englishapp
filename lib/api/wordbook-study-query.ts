import { Prisma } from "@prisma/client";

export type StudyView = "memorize" | "listCorrect" | "listWrong" | "listHalf";

export function buildItemWhere(input: {
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
      { meaningKo: { contains: input.q, mode: "insensitive" } },
      { pronunciation: { contains: input.q, mode: "insensitive" } },
      { example: { contains: input.q, mode: "insensitive" } },
      { exampleMeaning: { contains: input.q, mode: "insensitive" } },
      { exampleSentenceEn: { contains: input.q, mode: "insensitive" } },
      { exampleSentenceKo: { contains: input.q, mode: "insensitive" } }
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

export function buildMatchSql(input: {
  view: StudyView;
  hideCorrect: boolean;
  qLike: string | null;
}): Prisma.Sql {
  const qSql = input.qLike
    ? Prisma.sql`(
      wi."term" ILIKE ${input.qLike}
      OR wi."meaning" ILIKE ${input.qLike}
      OR COALESCE(wi."meaningKo", '') ILIKE ${input.qLike}
      OR COALESCE(wi."pronunciation", '') ILIKE ${input.qLike}
      OR COALESCE(wi."example", '') ILIKE ${input.qLike}
      OR COALESCE(wi."exampleMeaning", '') ILIKE ${input.qLike}
      OR COALESCE(wi."exampleSentenceEn", '') ILIKE ${input.qLike}
      OR COALESCE(wi."exampleSentenceKo", '') ILIKE ${input.qLike}
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
