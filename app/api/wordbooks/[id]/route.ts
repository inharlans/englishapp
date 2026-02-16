import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { bumpWordbookVersion } from "@/lib/wordbookVersion";
import { z } from "zod";

const patchWordbookSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    fromLang: z.string().trim().min(2).max(12).optional(),
    toLang: z.string().trim().min(2).max(12).optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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
    select: {
      id: true,
      ownerId: true,
      title: true,
      description: true,
      fromLang: true,
      toLang: true,
      isPublic: true,
      hiddenByAdmin: true,
      downloadCount: true,
      ratingAvg: true,
      ratingCount: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { id: true, email: true } },
      items: {
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
      }
    }
  });

  if (!wordbook) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const isOwner = wordbook.ownerId === user.id;
  if ((!wordbook.isPublic || wordbook.hiddenByAdmin) && !isOwner) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const [download, rating] = await Promise.all([
    prisma.wordbookDownload.findUnique({
      where: { userId_wordbookId: { userId: user.id, wordbookId: id } },
      select: { createdAt: true }
    }),
    prisma.wordbookRating.findUnique({
      where: { userId_wordbookId: { userId: user.id, wordbookId: id } },
      select: { rating: true, updatedAt: true }
    })
  ]);

  return NextResponse.json(
    {
      wordbook: {
        ...wordbook,
        isOwner,
        downloadedAt: download?.createdAt ?? null,
        myRating: rating?.rating ?? null
      }
    },
    { status: 200 }
  );
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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

  const existing = await prisma.wordbook.findUnique({
    where: { id },
    select: { ownerId: true }
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (existing.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const parsedBody = await parseJsonWithSchema(req, patchWordbookSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  const data: { title?: string; description?: string | null; fromLang?: string; toLang?: string } =
    {};

  if (typeof body.title === "string") {
    const t = body.title.trim();
    data.title = t;
  }
  if ("description" in body) {
    data.description = body.description ? String(body.description).trim() : null;
  }
  if (typeof body.fromLang === "string") {
    data.fromLang = body.fromLang.trim() || "en";
  }
  if (typeof body.toLang === "string") {
    data.toLang = body.toLang.trim() || "ko";
  }

  const wordbook = await prisma.$transaction(async (tx) => {
    const next = await tx.wordbook.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        description: true,
        fromLang: true,
        toLang: true,
        isPublic: true,
        downloadCount: true,
        ratingAvg: true,
        ratingCount: true,
        createdAt: true,
        updatedAt: true
      }
    });
    await bumpWordbookVersion(tx, id, { updatedCount: 1 });
    return next;
  });

  return NextResponse.json({ wordbook }, { status: 200 });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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

  const existing = await prisma.wordbook.findUnique({
    where: { id },
    select: { ownerId: true }
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (existing.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await prisma.wordbook.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
