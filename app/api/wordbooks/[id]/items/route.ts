import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { bumpWordbookVersion } from "@/lib/wordbookVersion";
import { z } from "zod";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

const newItemSchema = z.object({
  term: z.string().trim().min(1).max(300),
  meaning: z.string().trim().min(1).max(1000),
  pronunciation: z.string().trim().max(120).nullable().optional(),
  example: z.string().trim().max(1000).nullable().optional(),
  exampleMeaning: z.string().trim().max(1000).nullable().optional()
});

const addItemsSchema = z.object({
  items: z.array(newItemSchema).min(1).max(1000)
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (!id) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const wordbook = await prisma.wordbook.findUnique({
    where: { id },
    select: { ownerId: true }
  });
  if (!wordbook) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (wordbook.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const parsedBody = await parseJsonWithSchema(req, addItemsSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const items = parsedBody.data.items;

  const cleaned = items
    .map((it) => ({
      term: (it.term ?? "").trim(),
      meaning: (it.meaning ?? "").trim(),
      pronunciation: it.pronunciation ? String(it.pronunciation).trim() : null,
      example: it.example ? String(it.example).trim() : null,
      exampleMeaning: it.exampleMeaning ? String(it.exampleMeaning).trim() : null
    }))
    .filter((it) => it.term && it.meaning);

  if (cleaned.length === 0) {
    return NextResponse.json({ error: "No valid items." }, { status: 400 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const max = await tx.wordbookItem.aggregate({
      where: { wordbookId: id },
      _max: { position: true }
    });
    const start = (max._max.position ?? -1) + 1;
    await tx.wordbookItem.createMany({
      data: cleaned.map((it, idx) => ({
        wordbookId: id,
        term: it.term,
        meaning: it.meaning,
        pronunciation: it.pronunciation,
        example: it.example,
        exampleMeaning: it.exampleMeaning,
        position: start + idx
      }))
    });
    await bumpWordbookVersion(tx, id, { addedCount: cleaned.length });

    return tx.wordbookItem.findMany({
      where: { wordbookId: id },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      select: {
        id: true,
        term: true,
        meaning: true,
        pronunciation: true,
        example: true,
        exampleMeaning: true,
        position: true
      }
    });
  });

  return NextResponse.json({ items: created }, { status: 201 });
}
