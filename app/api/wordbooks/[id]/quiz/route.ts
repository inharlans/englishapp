import { NextRequest, NextResponse } from "next/server";

import { parsePositiveIntParam, requireUserFromRequest } from "@/lib/api/route-helpers";
import { parsePositiveInt, parseQuizMode, QuizService } from "@/server/domain/quiz/service";

const quizService = new QuizService();
const MAX_BATCH_SIZE = 50;

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idRaw } = await ctx.params;
  const wordbookId = parsePositiveIntParam(idRaw);
  if (!wordbookId) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const mode = parseQuizMode(searchParams.get("mode"));
  const partSize = parsePositiveInt(searchParams.get("partSize"), 30, 1, MAX_BATCH_SIZE);
  const partIndex = parsePositiveInt(searchParams.get("partIndex"), 1, 1, 100_000);

  const result = await quizService.getWordbookQuizQuestion(auth.user, wordbookId, {
    mode,
    partSize,
    partIndex
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.payload, { status: 200 });
}
