import { NextRequest, NextResponse } from "next/server";

import { asMobileAuthError, MobileAuthError } from "@/lib/mobileAuthErrors";
import { mobileAuthErrorJson } from "@/lib/mobileAuthResponse";
import { mobileRefreshSchema } from "@/lib/mobileAuthSchemas";
import {
  issueMobileAccessToken,
  rotateRefreshToken
} from "@/lib/mobileTokens";
import { captureAppError, recordApiMetricFromStart } from "@/lib/observability";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";

const ROUTE = "/api/auth/mobile/refresh";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const body = await req.json().catch(() => null);
    const parsed = mobileRefreshSchema.safeParse(body);
    if (!parsed.success) {
      throw new MobileAuthError(400, "AUTH_INVALID_REQUEST", "요청 본문이 올바르지 않습니다.");
    }

    const ip = getClientIpFromHeaders(req.headers);
    const limit = await checkRateLimit({
      key: `mobile-auth:refresh:${ip}`,
      limit: 30,
      windowMs: 60_000
    });
    if (!limit.ok) {
      throw new MobileAuthError(429, "AUTH_RATE_LIMITED", "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
    }

    const rotated = await rotateRefreshToken({
      refreshToken: parsed.data.refreshToken,
      deviceId: parsed.data.deviceId,
      ttlDays: 30
    });

    const accessToken = await issueMobileAccessToken({
      userId: rotated.userId,
      email: rotated.email,
      ttlSeconds: 60 * 15
    });

    await recordApiMetricFromStart({
      route: ROUTE,
      method: "POST",
      status: 200,
      startedAt,
      userId: rotated.userId
    });

    return NextResponse.json(
      {
        accessToken,
        refreshToken: rotated.newRefreshToken
      },
      {
        headers: {
          "Cache-Control": "no-store",
          Pragma: "no-cache"
        }
      }
    );
  } catch (error) {
    const mobileError = asMobileAuthError(error, {
      status: 500,
      errorCode: "AUTH_REFRESH_FAILED",
      message: "모바일 refresh 처리에 실패했습니다."
    });

    if (mobileError.status >= 500) {
      await captureAppError({
        route: ROUTE,
        message: "auth_mobile_refresh_failed",
        stack: error instanceof Error ? error.stack : undefined,
        context: {
          errorCode: mobileError.errorCode,
          err: error instanceof Error ? error.message : String(error)
        }
      });
    }
    await recordApiMetricFromStart({
      route: ROUTE,
      method: "POST",
      status: mobileError.status,
      startedAt
    });
    return mobileAuthErrorJson(mobileError);
  }
}
