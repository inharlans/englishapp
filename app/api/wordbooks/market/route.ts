import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { shouldHideWordbookFromMarket } from "@/lib/wordbookPolicy";

type SortMode = "top" | "new" | "downloads";

function parseSort(raw: string | null): SortMode {
  if (raw === "new" || raw === "downloads" || raw === "top") return raw;
  return "top";
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequestCookies(req.cookies);

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const sort = parseSort(searchParams.get("sort"));
  const page = Math.max(Number(searchParams.get("page") ?? "0") || 0, 0);
  const take = Math.min(Math.max(Number(searchParams.get("take") ?? "30") || 30, 1), 60);

  const blockedOwnerIds = user
    ? (
        await prisma.blockedOwner.findMany({
          where: { userId: user.id },
          select: { ownerId: true }
        })
      ).map((b) => b.ownerId)
    : [];

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
        : [{ rankScore: "desc" as const }, { createdAt: "desc" as const }];

  const candidates = await prisma.wordbook.findMany({
    where,
    orderBy: orderByForDb,
    select: {
      id: true,
      title: true,
      description: true,
      owner: { select: { email: true } },
      _count: { select: { items: true } }
    }
  });
  const eligibleIds = candidates
    .filter(
      (wb) =>
        !shouldHideWordbookFromMarket({
          title: wb.title,
          description: wb.description,
          ownerEmail: wb.owner.email,
          itemCount: wb._count.items
        })
    )
    .map((wb) => wb.id);
  const total = eligibleIds.length;
  const pageIds = eligibleIds.slice(page * take, page * take + take);

  const wordbooksUnordered =
    pageIds.length > 0
      ? await prisma.wordbook.findMany({
          where: { id: { in: pageIds } },
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
      : [];
  const byId = new Map(wordbooksUnordered.map((wb) => [wb.id, wb] as const));
  const wordbooks = pageIds
    .map((id) => byId.get(id))
    .filter((wb): wb is NonNullable<typeof wb> => wb !== undefined);

  return NextResponse.json({ total, page, take, sort, q, wordbooks }, { status: 200 });
}
