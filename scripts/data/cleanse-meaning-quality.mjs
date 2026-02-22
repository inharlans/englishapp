/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const POS_FULL = ["명사", "동사", "형용사", "부사", "대명사", "전치사", "접속사", "감탄사", "조동사", "관사", "수사"];

const POS_ALIAS = new Map(
  [
    ["noun", "명사"],
    ["verb", "동사"],
    ["adjective", "형용사"],
    ["adj", "형용사"],
    ["adverb", "부사"],
    ["adv", "부사"],
    ["pronoun", "대명사"],
    ["pron", "대명사"],
    ["preposition", "전치사"],
    ["prep", "전치사"],
    ["conjunction", "접속사"],
    ["conj", "접속사"],
    ["interjection", "감탄사"],
    ["interj", "감탄사"],
    ["auxiliary", "조동사"],
    ["aux", "조동사"],
    ["article", "관사"],
    ["determiner", "관사"],
    ["det", "관사"],
    ["numeral", "수사"],
    ["num", "수사"]
  ].map(([k, v]) => [k.toLowerCase(), v])
);

const POS_PREFIX_RE = new RegExp(`^(${POS_FULL.join("|")})(?=[가-힣A-Za-z])`);
const POS_TOKEN_RE = new RegExp(`\\b(${POS_FULL.join("|")})\\b`, "g");

function normalizeSpaces(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizePosLabel(raw) {
  const key = String(raw ?? "")
    .replace(/[()]/g, "")
    .trim()
    .toLowerCase();
  if (!key) return null;
  if (POS_ALIAS.has(key)) return POS_ALIAS.get(key);
  const direct = POS_FULL.find((p) => p === key);
  return direct ?? null;
}

function normalizeInlinePos(raw) {
  return raw.replace(/\(([^)]+)\)/g, (full, inner) => {
    const normalized = normalizePosLabel(inner);
    return normalized ? `(${normalized})` : full;
  });
}

function splitAndDedupe(raw) {
  const parts = raw
    .split(",")
    .map((p) => normalizeSpaces(p))
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(part);
  }
  return out.join(", ");
}

function cleanupMeaning(term, meaning) {
  const before = String(meaning ?? "");
  let next = normalizeSpaces(before);
  if (!next) return next;

  next = normalizeInlinePos(next);

  // Convert plain POS at token boundaries to parenthesized form.
  next = next.replace(POS_TOKEN_RE, (m) => `(${m})`);
  next = next.replace(/\(\(([^)]+)\)\)/g, "($1)");

  // Fix glued form: e.g. "전치사에서" -> "(전치사) 에서"
  next = next.replace(POS_PREFIX_RE, (_m, pos) => `(${pos}) `);

  // If no explicit POS exists but entry starts with known POS text, normalize it.
  if (!/\((?:명사|동사|형용사|부사|대명사|전치사|접속사|감탄사|조동사|관사|수사)\)/.test(next)) {
    next = next.replace(POS_PREFIX_RE, (_m, pos) => `(${pos}) `);
  }

  next = next
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*\/\s*/g, "/")
    .replace(/[?]{2,}/g, "?");
  next = splitAndDedupe(next);
  next = normalizeSpaces(next);

  // Avoid meaningless output.
  if (/^[,./()~\-_\s]+$/.test(next)) return before;

  // Guardrail: if we accidentally erased too much, keep original.
  if (next.length < Math.min(2, before.length)) return before;

  return next;
}

async function main() {
  const items = await prisma.wordbookItem.findMany({
    select: { id: true, term: true, meaning: true }
  });

  const updates = [];
  for (const row of items) {
    const cleaned = cleanupMeaning(row.term, row.meaning);
    if (cleaned !== row.meaning) {
      updates.push({ id: row.id, before: row.meaning, after: cleaned });
    }
  }

  console.log(`[cleanse] dryRun=${APPLY ? "false" : "true"}`);
  console.log(`[cleanse] changed=${updates.length}/${items.length}`);
  console.log("[cleanse] sample:");
  console.log(JSON.stringify(updates.slice(0, 20), null, 2));

  if (!APPLY) return;

  for (const row of updates) {
    await prisma.wordbookItem.update({
      where: { id: row.id },
      data: { meaning: row.after }
    });
  }
  console.log(`[cleanse] applied=${updates.length}`);
}

main()
  .catch((error) => {
    console.error("[cleanse] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

