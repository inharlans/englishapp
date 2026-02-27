import { NextRequest, NextResponse } from "next/server";

import { parsePositiveIntParam, requireUserFromRequest } from "@/lib/api/route-helpers";
import { type StudyView } from "@/lib/api/wordbook-study-query";
import { canAccessWordbookForStudy } from "@/lib/wordbookAccess";
import { WordbookStudyService } from "@/server/domain/wordbook/study-service";

const studyService = new WordbookStudyService();

function parseIntParam(raw: string | null, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function parseBoolParam(raw: string | null, fallback = false): boolean {
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return fallback;
}

function parseView(raw: string | null): StudyView {
  if (raw === "listCorrect" || raw === "listWrong" || raw === "listHalf" || raw === "memorize") {
    return raw;
  }
  return "memorize";
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idRaw } = await ctx.params;
  const wordbookId = parsePositiveIntParam(idRaw);
  if (!wordbookId) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const allowed = await canAccessWordbookForStudy({ userId: user.id, wordbookId });
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const sp = new URL(req.url).searchParams;
  const view = parseView(sp.get("view"));
  const page = parseIntParam(sp.get("page"), 0, 0, 100_000);
  const take = parseIntParam(sp.get("take"), 30, 1, 200);
  const q = (sp.get("q") ?? "").trim();
  const hideCorrect = parseBoolParam(sp.get("hideCorrect"), false);
  const partSizeRaw = sp.get("partSize");
  const partSize = partSizeRaw ? parseIntParam(partSizeRaw, 30, 1, 200) : null;
  const requestedPartIndex = parseIntParam(sp.get("partIndex"), 1, 1, 100_000);

  const result = await studyService.getStudyPayload({
    userId: user.id,
    wordbookId,
    view,
    page,
    take,
    q,
    hideCorrect,
    partSize,
    requestedPartIndex
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.payload, { status: 200 });
}
