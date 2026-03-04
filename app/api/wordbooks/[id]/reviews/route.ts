import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/authServer";
import { parsePositiveIntParam } from "@/lib/api/route-helpers";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { WordbookFeedbackService } from "@/server/domain/wordbook/feedback-service";

const feedbackService = new WordbookFeedbackService();

function isCrawlerLockdownEnabled(): boolean {
  const raw = (process.env.CRAWLER_LOCKDOWN_MODE ?? "on").trim().toLowerCase();
  return raw !== "off" && raw !== "0" && raw !== "false";
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idRaw } = await ctx.params;
  const id = parsePositiveIntParam(idRaw);
  if (!id) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const user = await getUserFromRequest(req);
  if (isCrawlerLockdownEnabled() && !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const ip = getClientIpFromHeaders(req.headers);
  const shouldApplyRateLimit = user !== null || ip !== "unknown";
  if (shouldApplyRateLimit) {
    const rateLimitKey = user ? `wordbookReviewsGet:user:${user.id}` : `wordbookReviewsGet:ip:${ip}`;
    const limit = await checkRateLimit({
      key: rateLimitKey,
      limit: 45,
      windowMs: 60_000
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many requests.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }
  }

  const takeRaw = Number(new URL(req.url).searchParams.get("take") ?? "30");
  const take = Math.min(Math.max(Number.isFinite(takeRaw) ? Math.floor(takeRaw) : 30, 1), 50);

  const result = await feedbackService.listReviews(id, take);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ reviews: result.reviews }, { status: 200 });
}
