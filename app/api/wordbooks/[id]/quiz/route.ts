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
    return NextResponse.json({ item: null, mode }, { status: 200 });
  }

  const byItemId = new Map(states.map((s) => [s.itemId, s]));
  const unseen = items.filter((it) => !byItemId.has(it.id));
  const wrong = items.filter((it) => byItemId.get(it.id)?.status === "WRONG");
  const pool = unseen.length > 0 ? unseen : wrong.length > 0 ? wrong : items;
  const picked = pool[Math.floor(Math.random() * pool.length)];

  return NextResponse.json({ item: picked, mode }, { status: 200 });
}

