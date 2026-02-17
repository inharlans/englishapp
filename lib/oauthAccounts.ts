import { getSessionCookieName, verifySessionToken } from "@/lib/authJwt";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

type Provider = "google" | "naver" | "kakao";

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function getCurrentUserIdFromCookies(cookies: {
  get(name: string): { value: string } | undefined;
}): Promise<number | null> {
  const token = cookies.get(getSessionCookieName())?.value;
  if (!token) return null;
  const claims = await verifySessionToken(token);
  const userId = Number(claims?.sub);
  if (!Number.isFinite(userId) || userId <= 0) return null;
  return Math.floor(userId);
}

export async function resolveOrLinkOAuthUser(input: {
  provider: Provider;
  providerUserId: string;
  email: string | null;
  cookies: { get(name: string): { value: string } | undefined };
}): Promise<{ ok: true; user: { id: number; email: string } } | { ok: false; errorCode: string }> {
  const provider = input.provider;
  const providerUserId = input.providerUserId.trim();
  const normalizedEmail = (input.email ?? "").trim().toLowerCase() || null;
  const currentUserId = await getCurrentUserIdFromCookies(input.cookies);

  if (!providerUserId) return { ok: false, errorCode: `${provider}_profile_missing_id` };

  try {
    const result = await prisma.$transaction<
      { user: { id: number; email: string } } | { errorCode: string }
    >(async (tx) => {
      const existing = await tx.oAuthAccount.findUnique({
        where: { provider_providerUserId: { provider, providerUserId } },
        select: { user: { select: { id: true, email: true } } }
      });
      if (existing) return { user: existing.user };

      let targetUser: { id: number; email: string } | null = null;

      if (currentUserId) {
        targetUser = await tx.user.findUnique({
          where: { id: currentUserId },
          select: { id: true, email: true }
        });
      }

      if (!targetUser && normalizedEmail) {
        targetUser = await tx.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true, email: true }
        });
      }

      if (!targetUser) {
        if (!normalizedEmail) return { errorCode: `${provider}_email_required` };
        const randomPassword = randomHex(32);
        const passwordHash = await hashPassword(randomPassword);
        targetUser = await tx.user.create({
          data: { email: normalizedEmail, passwordHash },
          select: { id: true, email: true }
        });
      }

      const alreadyLinkedByUser = await tx.oAuthAccount.findUnique({
        where: { userId_provider: { userId: targetUser.id, provider } },
        select: { providerUserId: true }
      });
      if (alreadyLinkedByUser && alreadyLinkedByUser.providerUserId !== providerUserId) {
        return { errorCode: `${provider}_already_linked_other_account` };
      }

      if (!alreadyLinkedByUser) {
        await tx.oAuthAccount.create({
          data: {
            userId: targetUser.id,
            provider,
            providerUserId,
            linkedEmail: normalizedEmail
          }
        });
      }

      return { user: targetUser };
    });

    if ("errorCode" in result && typeof result.errorCode === "string") {
      return { ok: false, errorCode: result.errorCode };
    }
    if ("user" in result) {
      return { ok: true, user: result.user };
    }
    return { ok: false, errorCode: `${provider}_link_failed` };
  } catch {
    return { ok: false, errorCode: `${provider}_link_failed` };
  }
}
