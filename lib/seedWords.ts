import fs from "fs";
import path from "path";

import { prisma } from "@/lib/prisma";

type SeedRow = {
  index: number;
  en: string;
  ko: string;
};

function parseWordsFile(filePath: string): SeedRow[] {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return [];
  }

  const header = lines[0].split("\t").map((cell) => cell.trim().toLowerCase());
  const indexIdx = header.indexOf("index");
  const enIdx = header.indexOf("en");
  const koIdx = header.indexOf("ko");
  if (enIdx === -1 || koIdx === -1) {
    throw new Error("words.tsv header must include en and ko");
  }

  const rows: SeedRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split("\t").map((cell) => cell.trim());
    const indexRaw = indexIdx >= 0 ? cols[indexIdx] : `${i}`;
    const en = cols[enIdx] ?? "";
    const ko = cols[koIdx] ?? "";
    if (!en || !ko) {
      continue;
    }
    const index = Number(indexRaw);
    if (!Number.isFinite(index)) {
      continue;
    }
    rows.push({ index: Math.floor(index), en, ko });
  }
  rows.sort((a, b) => a.index - b.index);
  return rows;
}

export async function ensureWordsSeeded(): Promise<void> {
  const filePath = path.join(process.cwd(), "words.tsv");
  if (!fs.existsSync(filePath)) {
    throw new Error("words.tsv not found in project root");
  }

  const rows = parseWordsFile(filePath);
  if (rows.length === 0) {
    throw new Error("words.tsv has no seed rows");
  }

  const count = await prisma.word.count();
  if (count === rows.length) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.resultState.deleteMany({});
    await tx.progress.deleteMany({});
    await tx.word.deleteMany({});

    for (const row of rows) {
      const created = await tx.word.create({
        data: {
          en: row.en,
          ko: row.ko
        },
        select: { id: true }
      });
      await tx.progress.create({
        data: {
          wordId: created.id,
          correctStreak: 0,
          wrongActive: false,
          wrongRecoveryRemaining: 0
        }
      });
      await tx.resultState.create({
        data: {
          wordId: created.id,
          everCorrect: false,
          everWrong: false,
          lastResult: null
        }
      });
    }
  });
}
