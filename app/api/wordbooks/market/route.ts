import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { computeWordbookRankScore } from "@/lib/wordbookRanking";

type SortMode = "top" | "new" | "downloads";

function parseSort(raw: string | null): SortMode {
  if (raw === "new" || raw === "downloads" || raw === "top") return raw;
  return "top";
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const sort = parseSort(searchParams.get("sort"));
  const page = Math.max(Number(searchParams.get("page") ?? "0") || 0, 0);
  const take = Math.min(Math.max(Number(searchParams.get("take") ?? "30") || 30, 1), 60);

  const blocked = await prisma.blockedOwner.findMany({
    where: { userId: user.id },
    select: { ownerId: true }
  });
  const blockedOwnerIds = blocked.map((b) => b.ownerId);

  const where = {
    isPublic: true,
    hiddenByAdmin: false,
    ...(blockedOwnerIds.length > 0 ? { ownerId: { notIn: blockedOwnerIds } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } }
          ]
        }
      : {})
  };

  const orderByForDb =
    sort === "new"
      ? [{ createdAt: "desc" as const }]
      : sort === "downloads"
        ? [{ downloadCount: "desc" as const }, { ratingAvg: "desc" as const }]
        : [
            { ratingAvg: "desc" as const },
            { ratingCount: "desc" as const },
            { downloadCount: "desc" as const },
            { createdAt: "desc" as const }
          ];

  const [total, fetched] = await Promise.all([
    prisma.wordbook.count({ where }),
    prisma.wordbook.findMany({
      where,
      orderBy: orderByForDb,
      skip: sort === "top" ? 0 : page * take,
      take: sort === "top" ? Math.min(400, (page + 1) * take + 120) : take,
      select: {
        id: true,
        title: true,
        description: true,
        fromLang: true,
        toLang: true,
        isPublic: true,
        downloadCount: true,
        ratingAvg: true,
        ratingCount: true,
        createdAt: true,
        updatedAt: true,
        owner: { select: { id: true, email: true } },
        _count: { select: { items: true } }
      }
    })
  ]);

  const withScore = fetched.map((wb) => ({
    ...wb,
    rankScore: computeWordbookRankScore({
      ratingAvg: wb.ratingAvg,
      ratingCount: wb.ratingCount,
      downloadCount: wb.downloadCount,
      createdAt: wb.createdAt
    })
  }));

  const wordbooks =
    sort === "top"
      ? withScore.sort((a, b) => b.rankScore - a.rankScore).slice(page * take, page * take + take)
      : withScore;

  return NextResponse.json({ total, page, take, sort, q, wordbooks }, { status: 200 });
}
