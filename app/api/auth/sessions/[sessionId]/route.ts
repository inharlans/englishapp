import { NextRequest, NextResponse } from "next/server";

import { requireUserFromRequest } from "@/lib/api/route-helpers";
import { errorJson } from "@/lib/api/service-response";
import { captureAppError } from "@/lib/observability";
import { assertTrustedMutationRequest } from "@/lib/requestSecurity";
import { prisma } from "@/lib/prisma";

const ROUTE = "/api/auth/sessions/[sessionId]";
const MAX_SESSION_ID = 2_147_483_647;

function parseSessionId(raw: string): number | null {
  if (!/^[1-9]\d*$/.test(raw)) {
    return null;
  }

  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0 || id > MAX_SESSION_ID) {
    return null;
  }
  return id;
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const badReq = await assertTrustedMutationRequest(req);
    if (badReq) return badReq;

    const auth = await requireUserFromRequest(req);
    if (!auth.ok) return auth.response;

    const { sessionId: raw } = await ctx.params;
    const sessionId = parseSessionId(raw);
    if (!sessionId) {
      return errorJson({
        status: 400,
        code: "AUTH_SESSIONS_INVALID_ID",
        message: "Invalid session id."
      });
    }

    const revoked = await prisma.mobileRefreshToken.updateMany({
      where: {
        userId: auth.user.id,
        id: sessionId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    return NextResponse.json(
      {
        ok: true,
        revokedCount: revoked.count,
        accessTokenRevoked: false,
        accessTokenTtlSeconds: 900
      },
      { status: 200 }
    );
  } catch (error) {
    await captureAppError({
      route: ROUTE,
      message: "auth_sessions_delete_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        err: error instanceof Error ? error.message : String(error)
      }
    });

    return errorJson({
      status: 500,
      code: "AUTH_SESSIONS_DELETE_FAILED",
      message: "Failed to delete session."
    });
  }
}
