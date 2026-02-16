import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { toDelimitedWordbook } from "@/lib/wordbookIo";
import { prisma } from "@/lib/prisma";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idRaw } = await ctx.params;
  const wordbookId = parseId(idRaw);
  if (!wordbookId) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const wordbook = await prisma.wordbook.findUnique({
    where: { id: wordbookId },
    select: { id: true, ownerId: true, title: true }
  });
  if (!wordbook) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (wordbook.ownerId !== user.id) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const format = new URL(req.url).searchParams.get("format") === "csv" ? "csv" : "tsv";
  const items = await prisma.wordbookItem.findMany({
    where: { wordbookId },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: {
      term: true,
      meaning: true,
      pronunciation: true,
      example: true,
      exampleMeaning: true
    }
  });

  const text = toDelimitedWordbook({
    rows: items.map((it) => ({
      term: it.term,
      meaning: it.meaning,
      pronunciation: it.pronunciation,
      example: it.example,
      exampleMeaning: it.exampleMeaning
    })),
    format
  });

  const ext = format === "csv" ? "csv" : "tsv";
  const filename = `${wordbook.title.replace(/[\\/:*?"<>|]/g, "_")}.${ext}`;
  return new NextResponse(text, {
    status: 200,
    headers: {
      "content-type": format === "csv" ? "text/csv; charset=utf-8" : "text/tab-separated-values; charset=utf-8",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    }
  });
}

