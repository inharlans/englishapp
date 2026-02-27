import { NextRequest, NextResponse } from "next/server";

import { parsePositiveIntParam } from "@/lib/api/route-helpers";
import { WordbookFeedbackService } from "@/server/domain/wordbook/feedback-service";

const feedbackService = new WordbookFeedbackService();

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idRaw } = await ctx.params;
  const id = parsePositiveIntParam(idRaw);
  if (!id) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const takeRaw = Number(new URL(req.url).searchParams.get("take") ?? "30");
  const take = Math.min(Math.max(Number.isFinite(takeRaw) ? Math.floor(takeRaw) : 30, 1), 100);

  const result = await feedbackService.listReviews(id, take);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ reviews: result.reviews }, { status: 200 });
}
