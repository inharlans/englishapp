import { prisma } from "@/lib/prisma";

export function isPrivateWordbookLockedForFree(input: {
  plan: "FREE" | "PRO";
  isOwner: boolean;
  isPublic: boolean;
}): boolean {
  return input.plan === "FREE" && input.isOwner && !input.isPublic;
}

export async function canAccessWordbookForStudy(input: {
  userId: number;
  wordbookId: number;
  userPlan?: "FREE" | "PRO";
}): Promise<boolean> {
  const wordbook = await prisma.wordbook.findUnique({
    where: { id: input.wordbookId },
    select: { id: true, ownerId: true, isPublic: true, hiddenByAdmin: true }
  });
  if (!wordbook) return false;
  if (wordbook.hiddenByAdmin) return wordbook.ownerId === input.userId;
  if (wordbook.ownerId === input.userId) {
    const plan =
      input.userPlan ??
      (
        await prisma.user.findUnique({
          where: { id: input.userId },
          select: { plan: true }
        })
      )?.plan ?? "FREE";
    return !isPrivateWordbookLockedForFree({
      plan,
      isOwner: true,
      isPublic: wordbook.isPublic
    });
  }
  if (!wordbook.isPublic) return false;

  const downloaded = await prisma.wordbookDownload.findUnique({
    where: { userId_wordbookId: { userId: input.userId, wordbookId: input.wordbookId } },
    select: { id: true }
  });
  return Boolean(downloaded);
}

