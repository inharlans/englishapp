import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireTrustedUserMutation } from "@/lib/api/mutation-route";
import { errorJson } from "@/lib/api/service-response";
import { captureAppError } from "@/lib/observability";
import { parseJsonWithSchema } from "@/lib/validation";
import { ClipperService } from "@/server/domain/clipper/service";

const ROUTE = "/api/word-capture";

const bodySchema = z.object({
  selectedWords: z.array(z.string().trim().min(1).max(120)).min(1).max(10)
});

const clipperService = new ClipperService();

function isDuplicateCaptureResult(result: { ok: boolean; status?: number; error?: string; payload?: { status?: string } }): boolean {
  if (result.ok && result.payload?.status === "merged") {
    return true;
  }

  if (!result.ok && result.status === 409 && result.error === "duplicate") {
    return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const startedAt = Date.now();
    const guard = await requireTrustedUserMutation(req, {
      route: ROUTE,
      method: "POST",
      startedAt
    });
    if (!guard.ok) return guard.response;

    const parsed = await parseJsonWithSchema(req, bodySchema);
    if (!parsed.ok) {
      return parsed.response;
    }

    let savedCount = 0;
    let duplicateCount = 0;
    const failed: string[] = [];
    const selectedWords = [...new Set(parsed.data.selectedWords)];

    for (const word of selectedWords) {
      const result = await clipperService.captureWord({
        user: guard.user,
        data: {
          term: word
        }
      });

      if (result.ok && result.payload.status === "created") {
        savedCount += 1;
        continue;
      }

      if (isDuplicateCaptureResult(result)) {
        duplicateCount += 1;
        continue;
      }

      failed.push(word);
    }

    return NextResponse.json(
      {
        ok: failed.length === 0,
        savedCount,
        duplicateCount,
        failed
      },
      { status: 200 }
    );
  } catch (error) {
    await captureAppError({
      route: ROUTE,
      message: "word_capture_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        err: error instanceof Error ? error.message : String(error)
      }
    });

    return errorJson({
      status: 500,
      code: "WORD_CAPTURE_FAILED",
      message: "Failed to capture words."
    });
  }
}
