import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { WordbookMarketService, parseMarketSort } from "@/server/domain/wordbook/market-service";

const marketService = new WordbookMarketService();

export async function GET(req: NextRequest) {
  const user = await getUserFromRequestCookies(req.cookies);

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const sort = parseMarketSort(searchParams.get("sort"));
  const page = Math.max(Number(searchParams.get("page") ?? "0") || 0, 0);
  const take = Math.min(Math.max(Number(searchParams.get("take") ?? "30") || 30, 1), 60);

  const result = await marketService.list(user, {
    q,
    sort,
    page,
    take
  });

  return NextResponse.json(result, { status: 200 });
}
