import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { canAccessWordbookForStudy } from "@/lib/wordbookAccess";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
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

  const [wordbook, state, itemStates] = await Promise.all([
    prisma.wordbook.findUnique({
      where: { id: wordbookId },
      select: {
        id: true,
        title: true,
        description: true,
        fromLang: true,
        toLang: true,
        items: {
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
        }
      }
    }),
    prisma.wordbookStudyState.findUnique({
      where: { userId_wordbookId: { userId: user.id, wordbookId } },
      select: { studiedCount: true, correctCount: true, wrongCount: true, updatedAt: true }
    }),
    prisma.wordbookStudyItemState.findMany({
      where: { userId: user.id, wordbookId },
      select: {
        itemId: true,
        status: true,
        streak: true,
        everCorrect: true,
        everWrong: true,
        lastResult: true,
        updatedAt: true
      }
    })
  ]);

  if (!wordbook) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
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
      itemStates
    },
    { status: 200 }
  );
}
