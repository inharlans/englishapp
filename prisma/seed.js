/* eslint-disable no-console */
/* prisma seed script for Railway/prod: only seeds when DB is empty. */

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

function normalizeTermForKey(term) {
  return term
    .trim()
    .replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function parseWordsTsv(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) return [];

  const header = lines[0].split("\t").map((c) => c.trim().toLowerCase());
  const enIdx = header.indexOf("en");
  const koIdx = header.indexOf("ko");
  if (enIdx === -1 || koIdx === -1) {
    throw new Error("words.tsv header must include en and ko columns");
  }

  const seen = new Set();
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split("\t").map((c) => c.trim());
    const en = cols[enIdx] || "";
    const ko = cols[koIdx] || "";
    if (!en || !ko) continue;

    const key = en.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);

    rows.push({ en, ko });
  }
  return rows;
}

function walkFiles(root) {
  const out = [];
  if (!fs.existsSync(root)) return out;

  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  }
  return out;
}

function parseWordbookTsv(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) return [];

  const header = lines[0].split("\t").map((c) => c.trim().toLowerCase());
  const enIdx = header.indexOf("en");
  const koIdx = header.indexOf("ko");
  if (enIdx === -1 || koIdx === -1) {
    return [];
  }

  const items = [];
  const seen = new Set();
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split("\t").map((c) => c.trim());
    const term = cols[enIdx] || "";
    const meaning = cols[koIdx] || "";
    if (!term || !meaning) continue;

    const key = `${term.toLowerCase()}::${meaning}`;
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({ term, meaning, position: items.length });
  }

  return items;
}

function makeTitleFromFilePath(filePath) {
  return path.basename(filePath).replace(/\.generated\.tsv$/i, "").trim();
}

function makeDescriptionFromFilePath(baseDir, filePath) {
  const rel = path.relative(baseDir, filePath);
  const relDir = path.dirname(rel);
  const source = rel.replace(/\\/g, "/");
  const category = relDir === "." ? "general" : relDir.replace(/\\/g, " / ");
  return `Imported from data/wordbooks-ko (${category}) [source:${source}]`;
}

async function seedWordsIfEmpty(prisma) {
  const wordCount = await prisma.word.count();
  if (wordCount > 0) {
    console.log(`[seed] words skip: already has ${wordCount} rows`);
    return;
  }

  const filePath = path.join(process.cwd(), "words.tsv");
  if (!fs.existsSync(filePath)) {
    throw new Error(`words.tsv not found at ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const rows = parseWordsTsv(raw);
  if (rows.length === 0) {
    throw new Error("words.tsv has no rows to seed");
  }

  const created = await prisma.word.createMany({
    data: rows,
    skipDuplicates: true
  });
  console.log(`[seed] word createMany: inserted ${created.count}`);

  const words = await prisma.word.findMany({
    select: { id: true },
    orderBy: { id: "asc" }
  });

  if (words.length === 0) {
    throw new Error("seed failed: no words found after insert");
  }

  console.log(`[seed] words done: seeded ${words.length} words`);
}

async function seedGeneratedWordbooks(prisma) {
  const baseDir = path.join(process.cwd(), "data", "wordbooks-ko");
  if (!fs.existsSync(baseDir)) {
    console.log("[seed] wordbooks skip: data/wordbooks-ko not found");
    return;
  }

  const files = walkFiles(baseDir)
    .filter((f) => f.toLowerCase().endsWith(".generated.tsv"))
    .sort((a, b) => a.localeCompare(b, "en"));

  if (files.length === 0) {
    console.log("[seed] wordbooks skip: no .generated.tsv files");
    return;
  }

  const seedEmail = "seed.wordbooks@local";
  const seedUser = await prisma.user.upsert({
    where: { email: seedEmail },
    update: {},
    create: {
      email: seedEmail,
      // disabled placeholder; not used for interactive login
      passwordHash: "seed-wordbooks-disabled-login"
    },
    select: { id: true }
  });

  let createdBooks = 0;
  let createdItems = 0;
  let skippedBooks = 0;

  for (const filePath of files) {
    const title = makeTitleFromFilePath(filePath);
    if (!title) {
      skippedBooks += 1;
      continue;
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const items = parseWordbookTsv(raw);
    if (items.length === 0) {
      skippedBooks += 1;
      continue;
    }

    const description = makeDescriptionFromFilePath(baseDir, filePath);

    const existing = await prisma.wordbook.findFirst({
      where: {
        ownerId: seedUser.id,
        title,
        fromLang: "en",
        toLang: "ko"
      },
      select: { id: true, _count: { select: { items: true } } },
      orderBy: { id: "asc" }
    });

    if (existing && existing._count.items > 0) {
      skippedBooks += 1;
      continue;
    }

    const wordbookId =
      existing?.id ??
      (
        await prisma.wordbook.create({
          data: {
            ownerId: seedUser.id,
            title,
            description,
            fromLang: "en",
            toLang: "ko",
            isPublic: true
          },
          select: { id: true }
        })
      ).id;

    if (existing) {
      await prisma.wordbookItem.deleteMany({ where: { wordbookId } });
      await prisma.wordbook.update({
        where: { id: wordbookId },
        data: {
          description,
          isPublic: true
        }
      });
    } else {
      createdBooks += 1;
    }

    await prisma.wordbookItem.createMany({
      data: items.map((item, idx) => ({
        wordbookId,
        term: item.term,
        meaning: item.meaning,
        meaningKo: item.meaning,
        normalizedTerm: normalizeTermForKey(item.term),
        exampleSource: "NONE",
        enrichmentStatus: "DONE",
        enrichmentCompletedAt: new Date(),
        pronunciation: null,
        position: idx
      }))
    });

    createdItems += items.length;
  }

  console.log(
    `[seed] wordbooks done: files=${files.length}, createdBooks=${createdBooks}, createdItems=${createdItems}, skippedBooks=${skippedBooks}`
  );
}

function isLocalDebugSeedEnabled() {
  const flag = (process.env.SEED_LOCAL_DEBUG ?? "").toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

function isLocalDatabaseUrl() {
  const raw = process.env.DATABASE_URL ?? "";
  if (!raw) return false;

  try {
    const normalized = raw.startsWith("postgres://") ? raw.replace("postgres://", "postgresql://") : raw;
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

async function refreshWordbookScore(prisma, wordbookId, itemCount) {
  const [downloadCount, ratingAgg] = await Promise.all([
    prisma.wordbookDownload.count({ where: { wordbookId } }),
    prisma.wordbookRating.aggregate({
      where: { wordbookId },
      _count: { id: true },
      _avg: { rating: true }
    })
  ]);

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

async function seedLocalDebugFixtures(prisma) {
  if (process.env.NODE_ENV === "production") {
    console.log("[seed] local-debug skip: production mode");
    return;
  }
  if (!isLocalDebugSeedEnabled()) {
    console.log("[seed] local-debug skip: set SEED_LOCAL_DEBUG=1 to enable");
    return;
  }
  if (!isLocalDatabaseUrl() && process.env.ALLOW_NONLOCAL_DEBUG_SEED !== "1") {
    console.log("[seed] local-debug skip: DATABASE_URL is not local (set ALLOW_NONLOCAL_DEBUG_SEED=1 to override)");
    return;
  }

  const debugEmail = process.env.LOCAL_DEBUG_EMAIL ?? "debug@local.oingapp";
  const debugPassword = process.env.LOCAL_DEBUG_PASSWORD ?? "debug1234!";
  const reviewerEmail = "reviewer@local.oingapp";
  const debugHash = await bcrypt.hash(debugPassword, 12);

  const [debugUser, reviewer] = await Promise.all([
    prisma.user.upsert({
      where: { email: debugEmail },
      update: { passwordHash: debugHash, plan: "PRO", proUntil: null, isAdmin: true },
      create: {
        email: debugEmail,
        passwordHash: debugHash,
        plan: "PRO",
        proUntil: null,
        isAdmin: true
      },
      select: { id: true }
    }),
    prisma.user.upsert({
      where: { email: reviewerEmail },
      update: { passwordHash: "seed-reviewer-disabled-login", plan: "FREE" },
      create: {
        email: reviewerEmail,
        passwordHash: "seed-reviewer-disabled-login",
        plan: "FREE"
      },
      select: { id: true }
    })
  ]);

  const marketWordbooks = await prisma.wordbook.findMany({
    where: { isPublic: true, hiddenByAdmin: false },
    select: { id: true, title: true, _count: { select: { items: true } } },
    orderBy: [{ rankScore: "desc" }, { createdAt: "desc" }],
    take: 12
  });

  let downloadSeeded = 0;
  let ratingSeeded = 0;

  for (let i = 0; i < marketWordbooks.length; i += 1) {
    const wb = marketWordbooks[i];

    const shouldDownloadByDebug = i < 8;
    const shouldDownloadByReviewer = i < 5;

    if (shouldDownloadByDebug) {
      await prisma.wordbookDownload.upsert({
        where: { userId_wordbookId: { userId: debugUser.id, wordbookId: wb.id } },
        update: {
          syncedAt: new Date(),
          snapshotItemCount: wb._count.items
        },
        create: {
          userId: debugUser.id,
          wordbookId: wb.id,
          downloadedVersion: 1,
          snapshotItemCount: wb._count.items
        }
      });
      downloadSeeded += 1;
    }

    if (shouldDownloadByReviewer) {
      await prisma.wordbookDownload.upsert({
        where: { userId_wordbookId: { userId: reviewer.id, wordbookId: wb.id } },
        update: {
          syncedAt: new Date(),
          snapshotItemCount: wb._count.items
        },
        create: {
          userId: reviewer.id,
          wordbookId: wb.id,
          downloadedVersion: 1,
          snapshotItemCount: wb._count.items
        }
      });
      downloadSeeded += 1;
    }

    const ratingByDebug = Math.max(3, 5 - Math.floor(i / 3));
    await prisma.wordbookRating.upsert({
      where: { userId_wordbookId: { userId: debugUser.id, wordbookId: wb.id } },
      update: {
        rating: ratingByDebug,
        review: i < 4 ? `Local debug review (${i + 1}) for market sort/review checks` : null
      },
      create: {
        userId: debugUser.id,
        wordbookId: wb.id,
        rating: ratingByDebug,
        review: i < 4 ? `Local debug review (${i + 1}) for market sort/review checks` : null
      }
    });
    ratingSeeded += 1;

    if (i < 6) {
      const ratingByReviewer = Math.max(2, 5 - Math.floor(i / 2));
      await prisma.wordbookRating.upsert({
        where: { userId_wordbookId: { userId: reviewer.id, wordbookId: wb.id } },
        update: {
          rating: ratingByReviewer,
          review: i < 3 ? `Sample reviewer feedback (${i + 1})` : null
        },
        create: {
          userId: reviewer.id,
          wordbookId: wb.id,
          rating: ratingByReviewer,
          review: i < 3 ? `Sample reviewer feedback (${i + 1})` : null
        }
      });
      ratingSeeded += 1;
    }

    await refreshWordbookScore(prisma, wb.id, wb._count.items);
  }

  console.log(
    `[seed] local-debug done: user=${debugEmail}, password=${debugPassword}, downloads=${downloadSeeded}, ratings=${ratingSeeded}, books=${marketWordbooks.length}`
  );
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await seedWordsIfEmpty(prisma);
    await seedGeneratedWordbooks(prisma);
    await seedLocalDebugFixtures(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[seed] error:", err);
  process.exitCode = 1;
});
