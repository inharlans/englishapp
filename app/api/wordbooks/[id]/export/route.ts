import { NextRequest, NextResponse } from "next/server";

import { parsePositiveIntParam, requireUserFromRequest } from "@/lib/api/route-helpers";
import { WordbookContentService } from "@/server/domain/wordbook/content-service";

const contentService = new WordbookContentService();

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idRaw } = await ctx.params;
  const wordbookId = parsePositiveIntParam(idRaw);
  if (!wordbookId) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const format = new URL(req.url).searchParams.get("format") === "csv" ? "csv" : "tsv";
  const result = await contentService.exportForOwner({
    user,
    wordbookId,
    format
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return new NextResponse(result.text, {
    status: 200,
    headers: {
      "content-type": result.format === "csv" ? "text/csv; charset=utf-8" : "text/tab-separated-values; charset=utf-8",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`
    }
  });
}
