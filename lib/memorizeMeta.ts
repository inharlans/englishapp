import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type RankedRow = {
  id: number;
  rn: number | bigint;
};

export type MemorizeMeta = {
  memorizeWeek: number;
  memorizePosition: number;
};

export async function getMemorizeMetaById(
  ids: number[]
): Promise<Map<number, MemorizeMeta>> {
  if (ids.length === 0) {
    return new Map();
  }

  const idList = Prisma.join(ids);
  const rows = await prisma.$queryRaw<RankedRow[]>(
    Prisma.sql`
      WITH ranked AS (
        SELECT "id", row_number() OVER (ORDER BY "id") AS "rn"
        FROM "Word"
      )
      SELECT "id", "rn" FROM ranked WHERE "id" IN (${idList})
    `
  );

  const map = new Map<number, MemorizeMeta>();
  for (const row of rows) {
    const rn = typeof row.rn === "bigint" ? Number(row.rn) : row.rn;
    const idx = rn - 1;
    map.set(row.id, {
      memorizeWeek: Math.floor(idx / 50) + 1,
      memorizePosition: (idx % 50) + 1
    });
  }
  return map;
}
