import type { JWTPayload } from "jose";
import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";

import { MobileAuthError } from "@/lib/mobileAuthErrors";
import { prisma } from "@/lib/prisma";

const DEFAULT_REFRESH_TTL_DAYS = 30;
const LEGACY_DEVICELESS_TOKEN_GRACE_UNTIL = "2026-04-01T00:00:00.000Z";

function getMobileAccessSecret(): Uint8Array {
  const secret = process.env.MOBILE_ACCESS_SECRET;
  if (!secret) {
    throw new Error("Missing MOBILE_ACCESS_SECRET env var");
  }
  return new TextEncoder().encode(secret);
}

function getRefreshPepper(): string {
  const pepper = process.env.MOBILE_REFRESH_PEPPER?.trim() ?? "";
  if (!pepper) {
    throw new Error("Missing MOBILE_REFRESH_PEPPER env var");
  }
  return pepper;
}

type MobileAccessClaims = JWTPayload & {
  email: string;
  deviceId: string;
  tokenType: "mobile_access";
};

export async function issueMobileAccessToken(input: {
  userId: number;
  email: string;
  deviceId: string;
  ttlSeconds: number;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    email: input.email,
    deviceId: input.deviceId,
    tokenType: "mobile_access"
  } satisfies Omit<MobileAccessClaims, "sub">)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + input.ttlSeconds)
    .setIssuer("mobile-access")
    .setAudience("mobile-api")
    .setSubject(String(input.userId))
    .sign(getMobileAccessSecret());
}

export async function verifyMobileAccessToken(token: string): Promise<{
  userId: number;
  email: string;
  deviceId: string | null;
} | null> {
  try {
    const { payload } = await jwtVerify(token, getMobileAccessSecret(), {
      algorithms: ["HS256"],
      issuer: "mobile-access",
      audience: "mobile-api"
    });

    const userId = Number(payload.sub);
    const email = payload.email;
    const deviceId = payload.deviceId;
    const tokenType = payload.tokenType;
    if (!Number.isFinite(userId) || userId <= 0) return null;
    if (typeof email !== "string" || !email) return null;
    if (tokenType !== "mobile_access") return null;

    let normalizedDeviceId: string | null = null;
    if (typeof deviceId === "string" && deviceId.length > 0) {
      if (deviceId.length < 8 || deviceId.length > 128) return null;
      normalizedDeviceId = deviceId;
    } else {
      const configuredGraceUntil = Date.parse(process.env.MOBILE_ACCESS_LEGACY_DEVICELESS_UNTIL ?? "");
      const fallbackGraceUntil = Date.parse(LEGACY_DEVICELESS_TOKEN_GRACE_UNTIL);
      const graceUntil = Number.isNaN(configuredGraceUntil) ? fallbackGraceUntil : configuredGraceUntil;

      if (Date.now() > graceUntil) {
        return null;
      }
    }

    return {
      userId: Math.floor(userId),
      email,
      deviceId: normalizedDeviceId
    };
  } catch {
    return null;
  }
}

export async function hashRefreshToken(raw: string): Promise<string> {
  const pepper = getRefreshPepper();
  return createHash("sha256").update(`${raw}.${pepper}`).digest("hex");
}

export async function mintRefreshTokenPair(input: {
  userId: number;
  deviceId: string;
  ttlDays?: number;
}): Promise<{ refreshToken: string; refreshTokenHash: string; expiresAt: Date }> {
  const ttlDays = input.ttlDays ?? DEFAULT_REFRESH_TTL_DAYS;
  const refreshToken = randomBytes(32).toString("hex");
  const refreshTokenHash = await hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  return {
    refreshToken,
    refreshTokenHash,
    expiresAt
  };
}

export async function rotateRefreshToken(input: {
  refreshToken: string;
  deviceId: string;
  ttlDays?: number;
}): Promise<{ userId: number; email: string; deviceId: string; newRefreshToken: string; newRefreshExpiresAt: Date }> {
  const tokenHash = await hashRefreshToken(input.refreshToken);

  return prisma.$transaction(async (tx) => {
    const row = await tx.mobileRefreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        deviceId: true,
        expiresAt: true,
        revokedAt: true,
        user: {
          select: {
            email: true
          }
        }
      }
    });

    if (!row) {
      throw new MobileAuthError(401, "AUTH_REFRESH_INVALID", "refresh token이 유효하지 않습니다.");
    }
    if (row.revokedAt) {
      throw new MobileAuthError(409, "AUTH_REFRESH_CONCURRENT", "이미 사용된 refresh token입니다.");
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      throw new MobileAuthError(401, "AUTH_REFRESH_INVALID", "refresh token이 만료되었습니다.");
    }
    if (input.deviceId !== row.deviceId) {
      throw new MobileAuthError(401, "AUTH_REFRESH_INVALID", "deviceId가 일치하지 않습니다.");
    }

    const revoked = await tx.mobileRefreshToken.updateMany({
      where: {
        id: row.id,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
    if (revoked.count !== 1) {
      throw new MobileAuthError(409, "AUTH_REFRESH_CONCURRENT", "동시 refresh 충돌이 발생했습니다.");
    }

    const minted = await mintRefreshTokenPair({
      userId: row.userId,
      deviceId: row.deviceId,
      ttlDays: input.ttlDays
    });

    try {
      await tx.mobileRefreshToken.create({
        data: {
          userId: row.userId,
          deviceId: row.deviceId,
          tokenHash: minted.refreshTokenHash,
          expiresAt: minted.expiresAt,
          rotatedFromId: row.id
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new MobileAuthError(409, "AUTH_REFRESH_CONCURRENT", "동시 refresh 충돌이 발생했습니다.");
      }
      throw error;
    }

    return {
      userId: row.userId,
      email: row.user.email,
      deviceId: row.deviceId,
      newRefreshToken: minted.refreshToken,
      newRefreshExpiresAt: minted.expiresAt
    };
  });
}

export async function validateRefreshTokenSubject(input: {
  refreshToken: string;
  deviceId: string;
}): Promise<{ userId: number; email: string }> {
  const tokenHash = await hashRefreshToken(input.refreshToken);
  const row = await prisma.mobileRefreshToken.findUnique({
    where: { tokenHash },
    select: {
      userId: true,
      deviceId: true,
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          email: true
        }
      }
    }
  });

  if (!row) {
    throw new MobileAuthError(401, "AUTH_REFRESH_INVALID", "refresh token이 유효하지 않습니다.");
  }
  if (row.revokedAt) {
    throw new MobileAuthError(409, "AUTH_REFRESH_CONCURRENT", "이미 사용된 refresh token입니다.");
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    throw new MobileAuthError(401, "AUTH_REFRESH_INVALID", "refresh token이 만료되었습니다.");
  }
  if (input.deviceId !== row.deviceId) {
    throw new MobileAuthError(401, "AUTH_REFRESH_INVALID", "deviceId가 일치하지 않습니다.");
  }

  return {
    userId: row.userId,
    email: row.user.email
  };
}
