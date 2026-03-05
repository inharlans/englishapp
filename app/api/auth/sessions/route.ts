import { NextRequest, NextResponse } from "next/server";

import { requireUserFromRequest } from "@/lib/api/route-helpers";
import { errorJson } from "@/lib/api/service-response";
import { verifyMobileAccessToken } from "@/lib/mobileTokens";
import { captureAppError } from "@/lib/observability";
import { prisma } from "@/lib/prisma";

const ROUTE = "/api/auth/sessions";

type SessionRow = {
  id: string;
  platform: "MOBILE";
  deviceLabel: string;
  createdAt: string;
  isCurrent: boolean;
};

function toSessionId(id: number): string {
  return String(id);
}

function toDeviceLabel(deviceId: string): string {
  const normalized = deviceId.trim();
  if (normalized.length <= 4) {
    return "Mobile device";
  }
  const head = normalized.slice(0, 3);
  const tail = normalized.slice(-2);
  return `${head}***${tail}`;
}

function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const match = authorizationHeader.match(/^\s*Bearer\s+(\S+)\s*$/i);
  return match?.[1] ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUserFromRequest(req);
    if (!auth.ok) return auth.response;
    const bearerToken = extractBearerToken(req.headers.get("authorization"));
    const authMode = (req.headers.get("x-auth-mode") ?? "").trim().toLowerCase();
    let currentDeviceId = "";

    let bearerClaims: Awaited<ReturnType<typeof verifyMobileAccessToken>> = null;

    if (bearerToken && authMode === "bearer") {
      bearerClaims = await verifyMobileAccessToken(bearerToken);
      if (bearerClaims && bearerClaims.userId === auth.user.id && bearerClaims.deviceId) {
        currentDeviceId = bearerClaims.deviceId;
      }
    }

    const now = new Date();

    const rows = await prisma.mobileRefreshToken.findMany({
      where: {
        userId: auth.user.id,
        revokedAt: null,
        expiresAt: { gt: now }
      },
      select: {
        id: true,
        deviceId: true,
        createdAt: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const currentDeviceMatchCount =
      currentDeviceId.length > 0 ? rows.filter((row) => row.deviceId === currentDeviceId).length : 0;

    const sessions: SessionRow[] = rows.map((row) => ({
      id: toSessionId(row.id),
      platform: "MOBILE",
      deviceLabel: toDeviceLabel(row.deviceId),
      createdAt: row.createdAt.toISOString(),
      isCurrent: currentDeviceMatchCount === 1 && currentDeviceId === row.deviceId
    }));

    return NextResponse.json({ sessions }, { status: 200 });
  } catch (error) {
    await captureAppError({
      route: ROUTE,
      message: "auth_sessions_get_failed",
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        err: error instanceof Error ? error.message : String(error)
      }
    });

    return errorJson({
      status: 500,
      code: "AUTH_SESSIONS_GET_FAILED",
      message: "Failed to load sessions."
    });
  }
}
