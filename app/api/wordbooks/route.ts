import { NextRequest, NextResponse } from "next/server";

import { requireUserFromRequest } from "@/lib/api/route-helpers";
import { errorJson } from "@/lib/api/service-response";
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
  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;

  const wordbooks = await wordbookService.listMine(auth.user);
  return NextResponse.json({ wordbooks }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const badReq = assertTrustedMutationRequest(req);
  if (badReq) return badReq;

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;

  const parsedBody = await parseJsonWithSchema(req, createWordbookSchema);
  if (!parsedBody.ok) return parsedBody.response;

  const title = parsedBody.data.title.trim();
  const fromLang = (parsedBody.data.fromLang ?? "en").trim() || "en";
  const toLang = (parsedBody.data.toLang ?? "ko").trim() || "ko";
  const description = parsedBody.data.description ? parsedBody.data.description.trim() : null;

  if (description && isBrokenUserText(description)) {
    return errorJson({
      status: 400,
      code: "INVALID_DESCRIPTION_TEXT",
      message: "설명 텍스트가 올바르지 않습니다."
    });
  }

  const created = await wordbookService.createMine(auth.user, {
    title,
    description,
    fromLang,
    toLang
  });

  if (!created.ok) {
    return errorJson({
      status: created.status,
      code: "WORDBOOK_CREATE_FAILED",
      message: created.error
    });
  }

  return NextResponse.json({ wordbook: created.wordbook }, { status: 201 });
}
