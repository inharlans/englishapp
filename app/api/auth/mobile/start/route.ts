import { NextRequest, NextResponse } from "next/server";

import { asMobileAuthError, MobileAuthError } from "@/lib/mobileAuthErrors";
import { mobileAuthErrorJson } from "@/lib/mobileAuthResponse";
import { mobileStartSchema } from "@/lib/mobileAuthSchemas";
import { buildAuthorizationUrl } from "@/lib/mobileOauthProviders";
import { assertValidMobileRedirectUri, resolveProviderRedirectUri } from "@/lib/mobileRedirectUri";
import { captureAppError, recordApiMetricFromStart } from "@/lib/observability";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { issueMobileState } from "@/lib/mobileState";

const ROUTE = "/api/auth/mobile/start";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const body = await req.json().catch(() => null);
    const parsed = mobileStartSchema.safeParse(body);
    if (!parsed.success) {
      throw new MobileAuthError(400, "AUTH_INVALID_REQUEST", "요청 본문이 올바르지 않습니다.");
    }

    const ip = getClientIpFromHeaders(req.headers);
    const limit = await checkRateLimit({
      key: `mobile-auth:start:${parsed.data.provider}:${ip}`,
      limit: 20,
      windowMs: 60_000
    });
    if (!limit.ok) {
      throw new MobileAuthError(429, "AUTH_RATE_LIMITED", "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
    }

    assertValidMobileRedirectUri(parsed.data.redirectUri);
    const providerRedirectUri = resolveProviderRedirectUri({
      provider: parsed.data.provider,
      mobileRedirectUri: parsed.data.redirectUri,
      requestOrigin: req.nextUrl.origin
    });

    const state = await issueMobileState({
      provider: parsed.data.provider,
      deviceId: parsed.data.deviceId,
      redirectUri: parsed.data.redirectUri,
      providerRedirectUri,
      codeChallenge: parsed.data.codeChallenge
    });

    const authorizationUrl = buildAuthorizationUrl({
      provider: parsed.data.provider,
      redirectUri: providerRedirectUri,
      state,
      codeChallenge: parsed.data.codeChallenge,
      codeChallengeMethod: parsed.data.codeChallengeMethod
    });

    await recordApiMetricFromStart({
      route: ROUTE,
      method: "POST",
      status: 200,
      startedAt
    });

    return NextResponse.json(
      {
        authorizationUrl,
        state
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
      errorCode: "AUTH_MOBILE_START_FAILED",
      message: "모바일 OAuth 시작 처리에 실패했습니다."
    });

    if (mobileError.status >= 500) {
      await captureAppError({
        route: ROUTE,
        message: "auth_mobile_start_failed",
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
