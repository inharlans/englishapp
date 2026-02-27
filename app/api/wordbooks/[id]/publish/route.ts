import { NextRequest, NextResponse } from "next/server";

import { parsePositiveIntParam, requireUserFromRequest } from "@/lib/api/route-helpers";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";
import { WordbookContentService } from "@/server/domain/wordbook/content-service";
import { z } from "zod";

const publishSchema = z.object({
  isPublic: z.boolean()
});

const contentService = new WordbookContentService();

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
  const result = await contentService.publishForOwner({
    user,
    wordbookId: id,
    isPublic: parsedBody.data.isPublic
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ wordbook: result.wordbook }, { status: 200 });
}
