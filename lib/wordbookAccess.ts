import { prisma } from "@/lib/prisma";

export async function canAccessWordbookForStudy(input: {
  userId: number;
  wordbookId: number;
}): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { isAdmin: true }
  });
  if (user?.isAdmin) return true;

  const wordbook = await prisma.wordbook.findUnique({
    where: { id: input.wordbookId },
    select: { id: true, ownerId: true, isPublic: true, hiddenByAdmin: true }
  });
  if (!wordbook) return false;
  if (wordbook.hiddenByAdmin) return wordbook.ownerId === input.userId;
  if (wordbook.ownerId === input.userId) return true;
  if (!wordbook.isPublic) return false;

  const downloaded = await prisma.wordbookDownload.findUnique({
    where: { userId_wordbookId: { userId: input.userId, wordbookId: input.wordbookId } },
    select: { id: true }
  });
  return Boolean(downloaded);
}
