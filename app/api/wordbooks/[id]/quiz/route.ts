import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { parsePositiveInt, parseQuizMode, QuizService } from "@/server/domain/quiz/service";

const quizService = new QuizService();

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

  const { searchParams } = new URL(req.url);
  const mode = parseQuizMode(searchParams.get("mode"));
  const partSize = parsePositiveInt(searchParams.get("partSize"), 30, 1, 200);
  const partIndex = parsePositiveInt(searchParams.get("partIndex"), 1, 1, 100_000);

  const result = await quizService.getWordbookQuizQuestion(user, wordbookId, {
    mode,
    partSize,
    partIndex
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.payload, { status: 200 });
}
