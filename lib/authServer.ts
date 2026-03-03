import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSessionCookieName, verifySessionToken } from "@/lib/authJwt";
import { verifyMobileAccessToken } from "@/lib/mobileTokens";
import { captureAppError } from "@/lib/observability";

type AuthenticatedUser = {
  id: number;
  email: string;
  isAdmin: boolean;
  plan: "FREE" | "PRO";
  proUntil: Date | null;
  dailyGoal: number;
};

async function findUserById(userId: number): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: Math.floor(userId) },
    select: { id: true, email: true, isAdmin: true, plan: true, proUntil: true, dailyGoal: true }
  });
  return user ?? null;
}

function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const match = authorizationHeader.match(/^\s*Bearer\s+(\S+)\s*$/i);
  return match?.[1] ?? null;
}

function parseAuthMode(req: NextRequest): "session" | "bearer" | null {
  const mode = (req.headers.get("x-auth-mode") ?? "").trim().toLowerCase();
  if (mode === "session" || mode === "bearer") {
    return mode;
  }
  return null;
}

function isExpectedBearerValidationError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: unknown; name?: unknown };
  if (typeof candidate.code === "string") {
    if (candidate.code.startsWith("ERR_JWT_")) {
      return true;
    }
    if (candidate.code.startsWith("ERR_JWS_")) {
      return true;
    }
    if (candidate.code === "ERR_JOSE_ALG_NOT_ALLOWED") {
      return true;
    }
  }

  if (typeof candidate.name === "string") {
    return [
      "JWTInvalid",
      "JWTExpired",
      "JWTClaimValidationFailed",
      "JOSEAlgNotAllowed",
      "JWSInvalid",
      "JWSSignatureVerificationFailed",
      "JWSInvalidSignature"
    ].includes(candidate.name);
  }

  return false;
}

async function verifyBearerTokenNoThrow(
  token: string,
  route: string
): Promise<{ userId: number; email: string } | null> {
  try {
    return await verifyMobileAccessToken(token);
  } catch (error) {
    if (isExpectedBearerValidationError(error)) {
      return null;
    }

    try {
      await captureAppError({
        route,
        level: "warn",
        message: "mobile_bearer_verify_failed",
        context: {
          reason: "bearer_verification_error"
        }
      });
    } catch {
      // Keep auth outcome independent from telemetry failures.
    }

    throw error;
  }
}

export async function getUserFromRequestCookies(cookies: {
  get(name: string): { value: string } | undefined;
}): Promise<AuthenticatedUser | null> {
  const token = cookies.get(getSessionCookieName())?.value;
  if (!token) {
    return null;
  }

  const claims = await verifySessionToken(token);
  if (!claims) {
    return null;
  }

  const userId = Number(claims.sub);
  if (!Number.isFinite(userId) || userId <= 0) {
    return null;
  }

  return findUserById(userId);
}

export async function getUserFromRequest(req: NextRequest): Promise<AuthenticatedUser | null> {
  const route = req.nextUrl.pathname;
  const bearerToken = extractBearerToken(req.headers.get("authorization"));
  const authMode = parseAuthMode(req);
  const sessionUser = await getUserFromRequestCookies(req.cookies);

  // When both credentials exist, auth mode deterministically selects one path.
  if (sessionUser && bearerToken) {
    if (authMode === "session" || authMode === null) {
      return sessionUser;
    }

    const claims = await verifyBearerTokenNoThrow(bearerToken, route);
    if (!claims) {
      return null;
    }

    if (claims.userId !== sessionUser.id) {
      return null;
    }

    return sessionUser;
  }

  if (sessionUser) {
    return sessionUser;
  }

  if (bearerToken) {
    const claims = await verifyBearerTokenNoThrow(bearerToken, route);
    return claims ? findUserById(claims.userId) : null;
  }

  return null;
}
