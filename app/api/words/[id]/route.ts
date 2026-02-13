import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type UpdateWordBody = {
  ko?: string;
};

function parseId(raw: string): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.floor(value);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json({ error: "유효하지 않은 word id 입니다." }, { status: 400 });
    }

    const body = (await req.json()) as UpdateWordBody;
    const ko = (body.ko ?? "").trim();
    if (!ko) {
      return NextResponse.json({ error: "뜻(ko)은 비워둘 수 없습니다." }, { status: 400 });
    }

    const updated = await prisma.word.update({
      where: { id },
      data: { ko },
      select: {
        id: true,
        en: true,
        ko: true
      }
    });

    return NextResponse.json({ word: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "뜻 수정 중 오류가 발생했습니다."
      },
      { status: 400 }
    );
  }
}
