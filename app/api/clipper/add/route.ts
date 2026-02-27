import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { returnWithMetric } from "@/lib/api/metric-response";
import { requireTrustedUserMutation } from "@/lib/api/mutation-route";
import { captureAppError } from "@/lib/observability";
import { parseJsonWithSchema } from "@/lib/validation";
import { clipperAddSchema, ClipperService } from "@/server/domain/clipper/service";

const bodySchema = z.object({
  term: z.string().trim().min(1).max(clipperAddSchema.CLIPPER_TERM_MAX_LEN),
  exampleSentenceEn: z.string().trim().max(clipperAddSchema.CLIPPER_EXAMPLE_MAX_LEN).optional(),
  sourceUrl: z.string().trim().url().max(2000).optional(),
  sourceTitle: z.string().trim().max(300).optional(),
  wordbookId: z.number().int().positive().optional()
});

const clipperService = new ClipperService();

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const guard = await requireTrustedUserMutation(req, {
    route: "/api/clipper/add",
    method: "POST",
    startedAt
  });
  if (!guard.ok) return guard.response;
  const user = guard.user;

  try {
    const parsed = await parseJsonWithSchema(req, bodySchema);
    if (!parsed.ok) {
      return returnWithMetric({
        response: parsed.response,
        route: "/api/clipper/add",
        method: "POST",
        startedAt,
        userId: user.id
      });
    }

    const result = await clipperService.addWord({ user, data: parsed.data });

    if (!result.ok) {
      return returnWithMetric({
        response: NextResponse.json({ error: result.error }, { status: result.status }),
        route: "/api/clipper/add",
        method: "POST",
        startedAt,
        userId: user.id
      });
    }

    return returnWithMetric({
      response: NextResponse.json(result.payload, { status: result.status }),
      route: "/api/clipper/add",
      method: "POST",
      startedAt,
      userId: user.id
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return returnWithMetric({
        response: NextResponse.json({ status: "duplicate", existingItemId: 0 }, { status: 200 }),
        route: "/api/clipper/add",
        method: "POST",
        startedAt,
        userId: user.id
      });
    }

    await captureAppError({
      route: "/api/clipper/add",
      message: "clipper_add_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: { err: error instanceof Error ? error.message : String(error) },
      userId: user.id
    });
    return returnWithMetric({
      response: NextResponse.json({ error: "클리퍼 저장에 실패했습니다." }, { status: 500 }),
      route: "/api/clipper/add",
      method: "POST",
      startedAt,
      userId: user.id
    });
  }
}
