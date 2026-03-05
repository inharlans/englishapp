import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";

import { asMobileAuthError, MobileAuthError } from "@/lib/mobileAuthErrors";
import { mobileAuthErrorJson } from "@/lib/mobileAuthResponse";
import { mobileExchangeSchema } from "@/lib/mobileAuthSchemas";
import {
  exchangeCodeForProviderToken,
  fetchProviderProfile
} from "@/lib/mobileOauthProviders";
import { assertValidMobileRedirectUri, resolveProviderRedirectUri } from "@/lib/mobileRedirectUri";
import { issueMobileAccessToken, mintRefreshTokenPair } from "@/lib/mobileTokens";
import { captureAppError, recordApiMetricFromStart } from "@/lib/observability";
import { resolveOrLinkOAuthUser } from "@/lib/oauthAccounts";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rateLimit";
import { verifyMobileState } from "@/lib/mobileState";

const ROUTE = "/api/auth/mobile/exchange";

function toBase64Url(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createCodeChallengeS256(codeVerifier: string): string {
  return toBase64Url(createHash("sha256").update(codeVerifier).digest());
}

function mapResolveErrorCode(errorCode: string): MobileAuthError {
  if (errorCode.endsWith("_email_required")) {
    return new MobileAuthError(401, "AUTH_EMAIL_REQUIRED", "이메일 제공이 필요합니다.");
  }
  if (errorCode.endsWith("_already_linked_other_account")) {
    return new MobileAuthError(401, "AUTH_PROFILE_FAILED", "이미 다른 계정에 연결된 OAuth 계정입니다.");
  }
  if (errorCode.endsWith("_profile_missing_id")) {
    return new MobileAuthError(401, "AUTH_PROFILE_FAILED", "OAuth 계정 식별자 확인에 실패했습니다.");
  }
  return new MobileAuthError(500, "AUTH_MOBILE_EXCHANGE_FAILED", "모바일 OAuth 처리 중 오류가 발생했습니다.");
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const body = await req.json().catch(() => null);
    const parsed = mobileExchangeSchema.safeParse(body);
    if (!parsed.success) {
      throw new MobileAuthError(400, "AUTH_INVALID_REQUEST", "요청 본문이 올바르지 않습니다.");
    }

    const ip = getClientIpFromHeaders(req.headers);
    const limit = await checkRateLimit({
      key: `mobile-auth:exchange:${parsed.data.provider}:${ip}`,
      limit: 15,
      windowMs: 60_000
    });
    if (!limit.ok) {
      throw new MobileAuthError(429, "AUTH_RATE_LIMITED", "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
    }

    const stateClaims = await verifyMobileState(parsed.data.state);
    if (!stateClaims) {
      throw new MobileAuthError(400, "AUTH_INVALID_STATE", "state 검증에 실패했습니다.");
    }
    if (stateClaims.provider !== parsed.data.provider || stateClaims.deviceId !== parsed.data.deviceId) {
      throw new MobileAuthError(400, "AUTH_INVALID_STATE", "state payload가 요청과 일치하지 않습니다.");
    }
    if (createCodeChallengeS256(parsed.data.codeVerifier) !== stateClaims.codeChallenge) {
      throw new MobileAuthError(400, "AUTH_INVALID_STATE", "PKCE 검증에 실패했습니다.");
    }

    assertValidMobileRedirectUri(stateClaims.redirectUri);

    const providerRedirectUri =
      parsed.data.provider === "google" && stateClaims.providerRedirectUri === stateClaims.redirectUri
        ? resolveProviderRedirectUri({
            provider: parsed.data.provider,
            requestOrigin: req.nextUrl.origin
          })
        : stateClaims.providerRedirectUri;

    const exchanged = await exchangeCodeForProviderToken({
      provider: parsed.data.provider,
      code: parsed.data.code,
      state: parsed.data.state,
      redirectUri: providerRedirectUri,
      codeVerifier: parsed.data.codeVerifier
    });

    const profile = await fetchProviderProfile({
      provider: parsed.data.provider,
      accessToken: exchanged.accessToken
    });

    if (!profile.providerUserId) {
      throw new MobileAuthError(401, "AUTH_PROFILE_FAILED", "OAuth 프로필 식별자 확인에 실패했습니다.");
    }

    let emailForLink = profile.email;
    if (!profile.email) {
      throw new MobileAuthError(401, "AUTH_EMAIL_REQUIRED", "이메일 제공 또는 인증이 필요합니다.");
    }
    if (profile.emailVerified !== true) {
      if (parsed.data.provider === "naver") {
        emailForLink = null;
      } else {
        throw new MobileAuthError(401, "AUTH_EMAIL_REQUIRED", "이메일 제공 또는 인증이 필요합니다.");
      }
    }

    const resolved = await resolveOrLinkOAuthUser({
      provider: parsed.data.provider,
      providerUserId: profile.providerUserId,
      email: emailForLink,
      cookies: {
        get: () => undefined
      }
    });
    if (!resolved.ok) {
      throw mapResolveErrorCode(resolved.errorCode);
    }

    const accessToken = await issueMobileAccessToken({
      userId: resolved.user.id,
      email: resolved.user.email,
      deviceId: parsed.data.deviceId,
      ttlSeconds: 60 * 15
    });

    const refreshPair = await mintRefreshTokenPair({
      userId: resolved.user.id,
      deviceId: parsed.data.deviceId,
      ttlDays: 30
    });

    try {
      await prisma.$transaction(
        async (tx) => {
          await tx.mobileRefreshToken.updateMany({
            where: {
              userId: resolved.user.id,
              deviceId: parsed.data.deviceId,
              revokedAt: null
            },
            data: {
              revokedAt: new Date()
            }
          });

          await tx.mobileRefreshToken.create({
            data: {
              userId: resolved.user.id,
              deviceId: parsed.data.deviceId,
              tokenHash: refreshPair.refreshTokenHash,
              expiresAt: refreshPair.expiresAt
            }
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        }
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034")
      ) {
        throw new MobileAuthError(409, "AUTH_REFRESH_CONCURRENT", "동시 로그인 충돌이 발생했습니다.");
      }
      throw error;
    }

    await recordApiMetricFromStart({
      route: ROUTE,
      method: "POST",
      status: 200,
      startedAt,
      userId: resolved.user.id
    });

    return NextResponse.json(
      {
        accessToken,
        refreshToken: refreshPair.refreshToken
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
      errorCode: "AUTH_MOBILE_EXCHANGE_FAILED",
      message: "모바일 OAuth 교환 처리에 실패했습니다."
    });

    if (mobileError.status >= 500) {
      await captureAppError({
        route: ROUTE,
        message: "auth_mobile_exchange_failed",
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
