import { NextRequest, NextResponse } from "next/server";

import { parsePositiveIntParam, requireUserFromRequest } from "@/lib/api/route-helpers";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { isBrokenUserText } from "@/lib/textQuality";
import { parseJsonWithSchema } from "@/lib/validation";
import { WordbookService } from "@/server/domain/wordbook/service";
import { z } from "zod";

const patchWordbookSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    fromLang: z.string().trim().min(2).max(12).optional(),
    toLang: z.string().trim().min(2).max(12).optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

const wordbookService = new WordbookService();

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idRaw } = await ctx.params;
  const id = parsePositiveIntParam(idRaw);
  if (!id) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;

  const found = await wordbookService.getByIdForActor(auth.user, id);
  if (!found.ok) {
    return NextResponse.json({ error: found.error }, { status: found.status });
  }

  return NextResponse.json({ wordbook: found.wordbook }, { status: 200 });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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

  const parsedBody = await parseJsonWithSchema(req, patchWordbookSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  const data: { title?: string; description?: string | null; fromLang?: string; toLang?: string } = {};

  if (typeof body.title === "string") {
    data.title = body.title.trim();
  }
  if ("description" in body) {
    data.description = body.description ? String(body.description).trim() : null;
    if (data.description && isBrokenUserText(data.description)) {
      return NextResponse.json({ error: "설명 텍스트가 올바르지 않습니다." }, { status: 400 });
    }
  }
  if (typeof body.fromLang === "string") {
    data.fromLang = body.fromLang.trim() || "en";
  }
  if (typeof body.toLang === "string") {
    data.toLang = body.toLang.trim() || "ko";
  }

  const updated = await wordbookService.updateMine(user, id, data);
  if (!updated.ok) {
    return NextResponse.json({ error: updated.error }, { status: updated.status });
  }

  return NextResponse.json({ wordbook: updated.wordbook }, { status: 200 });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const { id: idRaw } = await ctx.params;
  const id = parsePositiveIntParam(idRaw);
  if (!id) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;

  const removed = await wordbookService.deleteMine(auth.user, id);
  if (!removed.ok) {
    return NextResponse.json({ error: removed.error }, { status: removed.status });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
