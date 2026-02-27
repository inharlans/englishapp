import { NextRequest, NextResponse } from "next/server";

import { parsePositiveIntParam, requireUserFromRequest } from "@/lib/api/route-helpers";
import { requireOwnedWordbook } from "@/lib/api/wordbook-guards";
import { prisma } from "@/lib/prisma";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { getEffectivePlan } from "@/lib/userPlan";
import { parseJsonWithSchema } from "@/lib/validation";
import { MARKET_MIN_ITEM_COUNT } from "@/lib/wordbookPolicy";
import { z } from "zod";

const publishSchema = z.object({
  isPublic: z.boolean()
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const { id: idRaw } = await ctx.params;
  const id = parsePositiveIntParam(idRaw);
  if (!id) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const parsedBody = await parseJsonWithSchema(req, publishSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  const effectivePlan = getEffectivePlan({ plan: user.plan, proUntil: user.proUntil });
  if (effectivePlan === "FREE" && body.isPublic === false) {
    return NextResponse.json(
      { error: "무료 요금제에서는 단어장을 공개 상태로만 유지할 수 있습니다." },
      { status: 403 }
    );
  }

  const owned = await requireOwnedWordbook(user, id);
  if (!owned.ok) return owned.response;

  if (body.isPublic) {
    const itemCount = await prisma.wordbookItem.count({ where: { wordbookId: id } });
    if (itemCount < MARKET_MIN_ITEM_COUNT) {
      return NextResponse.json(
        { error: `마켓 공개는 ${MARKET_MIN_ITEM_COUNT}단어 이상부터 가능합니다.` },
        { status: 400 }
      );
    }
  }

  const wordbook = await prisma.wordbook.update({
    where: { id },
    data: { isPublic: body.isPublic },
    select: { id: true, isPublic: true, updatedAt: true }
  });
  return NextResponse.json({ wordbook }, { status: 200 });
}
