import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { refreshWordbookRankScore } from "@/lib/wordbookRanking";

export async function POST(req: NextRequest) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const ids = await prisma.wordbook.findMany({ select: { id: true } });
  for (const wb of ids) {
    await refreshWordbookRankScore(prisma, wb.id);
  }
  return NextResponse.json({ ok: true, count: ids.length }, { status: 200 });
}

