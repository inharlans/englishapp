import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { isBrokenUserText } from "@/lib/textQuality";
import { WordbookService } from "@/server/domain/wordbook/service";
import { z } from "zod";

const createWordbookSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).nullable().optional(),
  fromLang: z.string().trim().min(2).max(12).optional(),
  toLang: z.string().trim().min(2).max(12).optional()
});

const wordbookService = new WordbookService();

export async function GET(req: NextRequest) {
  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const wordbooks = await wordbookService.listMine(user);
  return NextResponse.json({ wordbooks }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const user = await getUserFromRequestCookies(req.cookies);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsedBody = await parseJsonWithSchema(req, createWordbookSchema);
  if (!parsedBody.ok) return parsedBody.response;

  const title = parsedBody.data.title.trim();
  const fromLang = (parsedBody.data.fromLang ?? "en").trim() || "en";
  const toLang = (parsedBody.data.toLang ?? "ko").trim() || "ko";
  const description = parsedBody.data.description ? parsedBody.data.description.trim() : null;

  if (description && isBrokenUserText(description)) {
    return NextResponse.json({ error: "설명 텍스트가 올바르지 않습니다." }, { status: 400 });
  }

  const created = await wordbookService.createMine(user, {
    title,
    description,
    fromLang,
    toLang
  });

  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: created.status });
  }

  return NextResponse.json({ wordbook: created.wordbook }, { status: 201 });
}
