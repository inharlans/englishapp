import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSessionCookieName, verifySessionToken } from "@/lib/authJwt";
import { verifyMobileAccessToken } from "@/lib/mobileTokens";

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
  const bearerToken = extractBearerToken(req.headers.get("authorization"));
  const authMode = (req.headers.get("x-auth-mode") ?? "").trim().toLowerCase();
  const sessionUser = await getUserFromRequestCookies(req.cookies);

  if (bearerToken) {
    if (sessionUser) {
      if (authMode === "session") {
        return sessionUser;
      }
      if (authMode === "bearer") {
        const claims = await verifyMobileAccessToken(bearerToken);
        return claims ? findUserById(claims.userId) : null;
      }
      return sessionUser;
    }

    const claims = await verifyMobileAccessToken(bearerToken);
    return claims ? findUserById(claims.userId) : null;
  }

  return sessionUser;
}
