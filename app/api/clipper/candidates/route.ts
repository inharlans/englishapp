import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireUserFromRequest } from "@/lib/api/route-helpers";
import { errorJson } from "@/lib/api/service-response";
import { captureAppError } from "@/lib/observability";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { parseJsonWithSchema } from "@/lib/validation";

const ROUTE = "/api/clipper/candidates";

const bodySchema = z.object({
  rawText: z.string().trim().min(1).max(3000)
});

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "that",
  "with",
  "from",
  "this",
  "have",
  "you",
  "your",
  "are",
  "was",
  "were",
  "has",
  "had",
  "will",
  "would",
  "there",
  "their",
  "about",
  "into",
  "been",
  "than",
  "then",
  "them",
  "they",
  "just",
  "also"
]);

function extractCandidates(rawText: string): string[] {
  const tokens = rawText
    .toLowerCase()
    .match(/[a-z][a-z'\-]{1,29}/g);

  if (!tokens) {
    return [];
  }

  const scores = new Map<string, number>();
  for (const token of tokens) {
    if (STOPWORDS.has(token)) {
      continue;
    }
    const next = (scores.get(token) ?? 0) + 1;
    scores.set(token, next);
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 50)
    .map(([word]) => word);
}

export async function POST(req: NextRequest) {
  try {
    const badReq = await assertTrustedMutationRequest(req);
    if (badReq) return badReq;

    const auth = await requireUserFromRequest(req);
    if (!auth.ok) return auth.response;

    const parsed = await parseJsonWithSchema(req, bodySchema);
    if (!parsed.ok) return parsed.response;

    const candidates = extractCandidates(parsed.data.rawText);
    return NextResponse.json({ candidates }, { status: 200 });
  } catch (error) {
    await captureAppError({
      route: ROUTE,
      message: "clipper_candidates_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        err: error instanceof Error ? error.message : String(error)
      }
    });

    return errorJson({
      status: 500,
      code: "CLIPPER_CANDIDATES_FAILED",
      message: "Failed to extract candidates."
    });
  }
}
