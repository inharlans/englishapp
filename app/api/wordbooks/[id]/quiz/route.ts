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

function parsePositiveInt(raw: string | null, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
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

  const allowed = await canAccessWordbookForStudy({ userId: user.id, wordbookId });
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const mode = parseMode(searchParams.get("mode"));
  const partSize = Math.min(200, Math.max(1, parsePositiveInt(searchParams.get("partSize"), 20)));
  const requestedPartIndex = parsePositiveInt(searchParams.get("partIndex"), 1);

  const [items, states] = await Promise.all([
    prisma.wordbookItem.findMany({
      where: { wordbookId },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      select: {
        id: true,
        term: true,
        meaning: true,
        pronunciation: true,
        example: true,
        exampleMeaning: true,
        position: true
      }
    }),
    prisma.wordbookStudyItemState.findMany({
      where: { userId: user.id, wordbookId },
      select: { itemId: true, status: true, updatedAt: true }
    })
  ]);

  if (items.length === 0) {
    return NextResponse.json(
      { item: null, mode, totalItems: 0, partSize, partIndex: 1, partCount: 1, partItemCount: 0 },
      { status: 200 }
    );
  }

  const partCount = Math.max(1, Math.ceil(items.length / partSize));
  const partIndex = Math.min(Math.max(requestedPartIndex, 1), partCount);
  const start = (partIndex - 1) * partSize;
  const partItems = items.slice(start, start + partSize);
  if (partItems.length === 0) {
    return NextResponse.json(
      { item: null, mode, totalItems: items.length, partSize, partIndex, partCount, partItemCount: 0 },
      { status: 200 }
    );
  }

  const byItemId = new Map(states.map((s) => [s.itemId, s]));
  const unseen = partItems.filter((it) => !byItemId.has(it.id));
  const wrong = partItems.filter((it) => byItemId.get(it.id)?.status === "WRONG");
  const pool = unseen.length > 0 ? unseen : wrong.length > 0 ? wrong : partItems;
  const picked = pool[Math.floor(Math.random() * pool.length)];

  return NextResponse.json(
    {
      item: picked,
      mode,
      totalItems: items.length,
      partSize,
      partIndex,
      partCount,
      partItemCount: partItems.length
    },
    { status: 200 }
  );
}
