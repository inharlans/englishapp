import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const debugEmail = process.env.LOCAL_DEBUG_EMAIL ?? "debug@local.oingapp";
const debugPassword = process.env.LOCAL_DEBUG_PASSWORD ?? "debug1234!";
const reviewerEmail = "reviewer@local.oingapp";

const marketBooks = [
  { title: "[LOCAL] TOEIC Core 120", itemCount: 120, theme: "Toeic core words for beginners." },
  { title: "[LOCAL] Daily Conversation 140", itemCount: 140, theme: "Daily conversation words and phrases." },
  { title: "[LOCAL] Work Email 160", itemCount: 160, theme: "Practical words for office email writing." },
  { title: "[LOCAL] Tech Interview 180", itemCount: 180, theme: "Engineering interview vocabulary set." },
  { title: "[LOCAL] Travel Essentials 200", itemCount: 200, theme: "Travel and airport survival vocabulary." },
  { title: "[LOCAL] Business News 220", itemCount: 220, theme: "Business news and economy reading terms." }
];

function normalizeTermForKey(term) {
  return term
    .trim()
    .replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function makeItems(title, count) {
  return Array.from({ length: count }).map((_, idx) => ({
    term: `${title.split(" ").slice(-1)[0].toLowerCase()}-${idx + 1}`,
    meaning: `sample meaning ${idx + 1}`,
    position: idx
  }));
}

async function refreshStats(wordbookId, itemCount) {
  const downloadCount = await prisma.wordbookDownload.count({ where: { wordbookId } });
  const ratingAgg = await prisma.wordbookRating.aggregate({
    where: { wordbookId },
    _count: { id: true },
    _avg: { rating: true }
  });

  const ratingCount = ratingAgg._count.id ?? 0;
  const ratingAvg = ratingAgg._avg.rating ?? 0;
  const rankScore = downloadCount * 3 + ratingAvg * 20 + ratingCount * 2 + itemCount * 0.01;

  await prisma.wordbook.update({
    where: { id: wordbookId },
    data: {
      downloadCount,
      ratingCount,
      ratingAvg,
      rankScore,
      rankScoreUpdatedAt: new Date()
    }
  });
}

async function main() {
  const debugHash = await bcrypt.hash(debugPassword, 12);
  const debugUser = await prisma.user.upsert({
    where: { email: debugEmail },
    update: { passwordHash: debugHash, plan: "PRO", isAdmin: true, proUntil: null },
    create: { email: debugEmail, passwordHash: debugHash, plan: "PRO", isAdmin: true, proUntil: null }
  });
  const reviewer = await prisma.user.upsert({
    where: { email: reviewerEmail },
    update: { passwordHash: "seed-reviewer-disabled-login", plan: "FREE", isAdmin: false },
    create: { email: reviewerEmail, passwordHash: "seed-reviewer-disabled-login", plan: "FREE", isAdmin: false }
  });

  const existing = await prisma.wordbook.findMany({
    where: { ownerId: debugUser.id, title: { startsWith: "[LOCAL]" } },
    select: { id: true }
  });
  if (existing.length > 0) {
    await prisma.wordbook.deleteMany({ where: { id: { in: existing.map((b) => b.id) } } });
  }

  let seededBooks = 0;
  for (let i = 0; i < marketBooks.length; i += 1) {
    const book = marketBooks[i];
    const created = await prisma.wordbook.create({
      data: {
        ownerId: debugUser.id,
        title: book.title,
        description: book.theme,
        fromLang: "en",
        toLang: "ko",
        isPublic: true
      }
    });

    await prisma.wordbookItem.createMany({
      data: makeItems(book.title, book.itemCount).map((item) => ({
        wordbookId: created.id,
        term: item.term,
        meaning: item.meaning,
        meaningKo: item.meaning,
        normalizedTerm: normalizeTermForKey(item.term),
        exampleSource: "NONE",
        enrichmentStatus: "DONE",
        enrichmentCompletedAt: new Date(),
        position: item.position
      }))
    });

    await prisma.wordbookDownload.upsert({
      where: { userId_wordbookId: { userId: debugUser.id, wordbookId: created.id } },
      update: { snapshotItemCount: book.itemCount, syncedAt: new Date() },
      create: {
        userId: debugUser.id,
        wordbookId: created.id,
        downloadedVersion: 1,
        snapshotItemCount: book.itemCount
      }
    });

    if (i < 4) {
      await prisma.wordbookDownload.upsert({
        where: { userId_wordbookId: { userId: reviewer.id, wordbookId: created.id } },
        update: { snapshotItemCount: book.itemCount, syncedAt: new Date() },
        create: {
          userId: reviewer.id,
          wordbookId: created.id,
          downloadedVersion: 1,
          snapshotItemCount: book.itemCount
        }
      });
    }

    await prisma.wordbookRating.upsert({
      where: { userId_wordbookId: { userId: debugUser.id, wordbookId: created.id } },
      update: {
        rating: Math.max(3, 5 - Math.floor(i / 2)),
        review: `Local debug review ${i + 1}`
      },
      create: {
        userId: debugUser.id,
        wordbookId: created.id,
        rating: Math.max(3, 5 - Math.floor(i / 2)),
        review: `Local debug review ${i + 1}`
      }
    });

    if (i < 3) {
      await prisma.wordbookRating.upsert({
        where: { userId_wordbookId: { userId: reviewer.id, wordbookId: created.id } },
        update: { rating: 4, review: `Sample reviewer feedback ${i + 1}` },
        create: {
          userId: reviewer.id,
          wordbookId: created.id,
          rating: 4,
          review: `Sample reviewer feedback ${i + 1}`
        }
      });
    }

    await refreshStats(created.id, book.itemCount);
    seededBooks += 1;
  }

  console.log(`[local-market-seed] done: books=${seededBooks}, user=${debugEmail}, password=${debugPassword}`);
}

main()
  .catch((error) => {
    console.error("[local-market-seed] error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
