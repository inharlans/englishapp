/* eslint-disable no-console */
/* prisma seed script for Railway/prod: only seeds when DB is empty. */

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

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

async function main() {
  const prisma = new PrismaClient();
  try {
    await seedWordsIfEmpty(prisma);
    await seedGeneratedWordbooks(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[seed] error:", err);
  process.exitCode = 1;
});
