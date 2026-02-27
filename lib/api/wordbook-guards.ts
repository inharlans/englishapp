import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getEffectivePlan } from "@/lib/userPlan";
import { isPrivateWordbookLockedForFree } from "@/lib/wordbookAccess";

import type { RequestUser } from "@/lib/api/route-helpers";

type OwnedWordbook = {
  id: number;
  ownerId: number;
  isPublic: boolean;
};

export async function requireOwnedWordbook(
  user: RequestUser,
  wordbookId: number
): Promise<{ ok: true; wordbook: OwnedWordbook } | { ok: false; response: NextResponse<{ error: string }> }> {
  const wordbook = await prisma.wordbook.findUnique({
    where: { id: wordbookId },
    select: { id: true, ownerId: true, isPublic: true }
  });
  if (!wordbook) {
    return { ok: false, response: NextResponse.json({ error: "Not found." }, { status: 404 }) };
  }
  if (wordbook.ownerId !== user.id) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }
  return { ok: true, wordbook };
}

export function getWordbookEditPlanGuardError(user: RequestUser, wordbook: Pick<OwnedWordbook, "isPublic">) {
  if (
    isPrivateWordbookLockedForFree({
      plan: getEffectivePlan({ plan: user.plan, proUntil: user.proUntil }),
      isOwner: true,
      isPublic: wordbook.isPublic
    })
  ) {
    return NextResponse.json(
      { error: "무료 요금제에서는 비공개 단어장을 수정할 수 없습니다. 공개 전환 또는 업그레이드가 필요합니다." },
      { status: 403 }
    );
  }
  return null;
}
