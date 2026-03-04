import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/authServer";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { WordbookMarketService, parseMarketSort } from "@/server/domain/wordbook/market-service";

const marketService = new WordbookMarketService();

function isCrawlerLockdownEnabled(): boolean {
  const raw = (process.env.CRAWLER_LOCKDOWN_MODE ?? "on").trim().toLowerCase();
  return raw !== "off" && raw !== "0" && raw !== "false";
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (isCrawlerLockdownEnabled() && !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const ip = getClientIpFromHeaders(req.headers);
  const shouldApplyRateLimit = user !== null || ip !== "unknown";
  if (shouldApplyRateLimit) {
    const rateLimitKey = user ? `wordbookMarketGet:user:${user.id}` : `wordbookMarketGet:ip:${ip}`;
    const limit = await checkRateLimit({
      key: rateLimitKey,
      limit: 30,
      windowMs: 60_000
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many requests.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const sort = parseMarketSort(searchParams.get("sort"));
  const page = Math.max(Number(searchParams.get("page") ?? "0") || 0, 0);
  const take = Math.min(Math.max(Number(searchParams.get("take") ?? "30") || 30, 1), 50);

  const result = await marketService.list(user, {
    q,
    sort,
    page,
    take
  });

  return NextResponse.json(result, { status: 200 });
}
