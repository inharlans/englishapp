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

async function main() {
  const prisma = new PrismaClient();
  try {
    const wordCount = await prisma.word.count();
    if (wordCount > 0) {
      console.log(`[seed] skip: Word table already has ${wordCount} rows`);
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

    await prisma.progress.createMany({
      data: words.map((w) => ({
        wordId: w.id,
        correctStreak: 0,
        wrongActive: false,
        wrongRecoveryRemaining: 0
      })),
      skipDuplicates: true
    });

    await prisma.resultState.createMany({
      data: words.map((w) => ({
        wordId: w.id,
        everCorrect: false,
        everWrong: false,
        lastResult: null
      })),
      skipDuplicates: true
    });

    console.log(`[seed] done: seeded ${words.length} words`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[seed] error:", err);
  process.exitCode = 1;
});

