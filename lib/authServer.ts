import { prisma } from "@/lib/prisma";
import { getSessionCookieName, verifySessionToken } from "@/lib/authJwt";

export async function getUserFromRequestCookies(cookies: {
  get(name: string): { value: string } | undefined;
}): Promise<{ id: number; email: string } | null> {
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

  const user = await prisma.user.findUnique({
    where: { id: Math.floor(userId) },
    select: { id: true, email: true }
  });
  return user ?? null;
}

