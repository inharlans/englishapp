import { prisma } from "@/lib/prisma";
import { getSessionCookieName, verifySessionToken } from "@/lib/authJwt";
import { PREVIEW_BYPASS_COOKIE } from "@/lib/previewBypass";

export async function getUserFromRequestCookies(cookies: {
  get(name: string): { value: string } | undefined;
}): Promise<{
  id: number;
  email: string;
  isAdmin: boolean;
  plan: "FREE" | "PRO";
  proUntil: Date | null;
} | null> {
  const token = cookies.get(getSessionCookieName())?.value;
  const hasPreviewBypass = cookies.get(PREVIEW_BYPASS_COOKIE)?.value === "1";
  if (!token && hasPreviewBypass) {
    const previewUser =
      (await prisma.user.findFirst({
        where: { isAdmin: false },
        orderBy: [{ id: "asc" }],
        select: { id: true, email: true, isAdmin: true, plan: true, proUntil: true }
      })) ??
      (await prisma.user.findFirst({
        orderBy: [{ id: "asc" }],
        select: { id: true, email: true, isAdmin: true, plan: true, proUntil: true }
      }));
    return previewUser ?? null;
  }

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
    select: { id: true, email: true, isAdmin: true, plan: true, proUntil: true }
  });
  return user ?? null;
}
