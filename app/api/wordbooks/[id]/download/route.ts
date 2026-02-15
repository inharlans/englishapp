import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function isPro(user: { plan: "FREE" | "PRO"; proUntil: Date | null }): boolean {
  if (user.plan !== "PRO") return false;
  if (!user.proUntil) return true;
  return user.proUntil.getTime() >= Date.now();
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (!id) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const wordbook = await tx.wordbook.findUnique({
      where: { id },
      select: { id: true, isPublic: true, downloadCount: true }
    });
    if (!wordbook || !wordbook.isPublic) {
      return { ok: false as const, status: 404, error: "Not found." };
    }

    const existing = await tx.wordbookDownload.findUnique({
      where: { userId_wordbookId: { userId: user.id, wordbookId: id } },
      select: { id: true, createdAt: true }
    });

    if (existing) {
      return {
        ok: true as const,
        already: true,
        downloadedAt: existing.createdAt,
        downloadCount: wordbook.downloadCount
      };
    }

    // Plan enforcement: FREE => 3 downloads lifetime.
    if (!isPro(user)) {
      const used = await tx.wordbookDownload.count({
        where: { userId: user.id }
      });
      if (used >= 3) {
        return {
          ok: false as const,
          status: 402,
          error: "Free plan download limit reached (3 lifetime)."
        };
      }
    }

    const created = await tx.wordbookDownload.create({
      data: { userId: user.id, wordbookId: id },
      select: { createdAt: true }
    });

    const updated = await tx.wordbook.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
      select: { downloadCount: true }
    });

    return {
      ok: true as const,
      already: false,
      downloadedAt: created.createdAt,
      downloadCount: updated.downloadCount
    };
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      ok: true,
      already: result.already,
      downloadedAt: result.downloadedAt,
      downloadCount: result.downloadCount
    },
    { status: 200 }
  );
}
