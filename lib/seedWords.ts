import fs from "fs";
import path from "path";

import { prisma } from "@/lib/prisma";

type SeedRow = {
  index: number;
  en: string;
  ko: string;
};

function normalizeEnKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[-_]+/g, " ")
    .trim();
}

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
  const seenEn = new Set<string>();
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split("\t").map((cell) => cell.trim());
    const indexRaw = indexIdx >= 0 ? cols[indexIdx] : `${i}`;
    const en = cols[enIdx] ?? "";
    const ko = cols[koIdx] ?? "";
    if (!en || !ko) {
      continue;
    }
    const normalized = normalizeEnKey(en);
    if (!normalized || seenEn.has(normalized)) {
      continue;
    }
    seenEn.add(normalized);
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
  // In production we only seed an empty DB. Never delete existing rows here.
  if (count > 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.word.createMany({
      data: rows.map((row) => ({ en: row.en, ko: row.ko })),
      skipDuplicates: true
    });
  });
}
