#!/usr/bin/env node
/**
 * Build FULL en+ko wordbooks (ko in "(명)(동)..." style) from an NGSL-family stats CSV.
 *
 * Strategy:
 * - Load ranked words from CSV (format varies by list).
 * - Fetch Korean translations from Kaikki/Wiktionary.
 * - Keep only entries that have non-empty `ko`.
 * - Chunk into multiple wordbooks, each entry guaranteed to have en+ko.
 *
 * Output:
 * - "<start>~<end> <title>.generated.tsv" with index,en,ko
 * - "<start>~<end> <title>.txt" with "en\tko" per line (human friendly)
 *
 * Usage:
 *   node scripts/build-wordbooks-ko-from-stats-csv.mjs --in data/crawled/ngsl-family/ngsl/NGSL_1.2_stats.csv --title "NGSL 1.2 (KO)" --outDir data/wordbooks-ko/ngsl --chunk 300 --max 2400
 */

import fs from "node:fs";
import path from "node:path";
import { ensureDir, fetchKoForWords } from "./lib/kaikki-ko.mjs";

function parseArgs(argv) {
  const args = {
    in: null,
    title: null,
    outDir: null,
    chunk: 300,
    max: 2400,
    concurrency: 6,
    cacheDir: "data/cache/kaikki",
    userAgent: "englishapp-wordbook/1.0 (kaikki.org; wiktionary-derived)",
    minBooks: 1,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--in" && i + 1 < argv.length) args.in = argv[++i];
    else if (a === "--title" && i + 1 < argv.length) args.title = argv[++i];
    else if (a === "--outDir" && i + 1 < argv.length) args.outDir = argv[++i];
    else if (a === "--chunk" && i + 1 < argv.length) args.chunk = Number(argv[++i]);
    else if (a === "--max" && i + 1 < argv.length) args.max = Number(argv[++i]);
    else if (a === "--concurrency" && i + 1 < argv.length) args.concurrency = Number(argv[++i]);
    else if (a === "--cacheDir" && i + 1 < argv.length) args.cacheDir = argv[++i];
    else if (a === "--minBooks" && i + 1 < argv.length) args.minBooks = Number(argv[++i]);
    else if (a === "-h" || a === "--help") args.help = true;
    else throw new Error(`Unknown arg: ${a}`);
  }
  return args;
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ",") {
        out.push(cur);
        cur = "";
      } else if (ch === '"') {
        inQ = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}

function loadRankedWords(csvText) {
  const lines = csvText.split(/\r?\n/).filter((l) => l && l.trim().length);
  if (!lines.length) throw new Error("Empty CSV");

  let header = null;
  let headerLineIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 50); i++) {
    const cols = parseCsvLine(lines[i]).map((s) => s.trim());
    const lc = cols.map((c) => c.toLowerCase());
    const hasWord = lc.includes("lemma") || lc.includes("word");
    const hasRank = lc.some((c) => c === "rank" || c.endsWith(" rank") || c.includes("rank"));
    if (hasWord && hasRank) {
      header = cols;
      headerLineIdx = i;
      break;
    }
  }
  if (!header) throw new Error("Could not find header row");

  const lcHeader = header.map((h) => h.toLowerCase());
  const wordIdx = lcHeader.findIndex((h) => h === "lemma" || h === "word");
  let rankIdx = lcHeader.findIndex((h) => h === "sfi rank");
  if (rankIdx < 0) rankIdx = lcHeader.findIndex((h) => h.endsWith(" rank") && h !== "sfi rank");
  if (rankIdx < 0) rankIdx = lcHeader.findIndex((h) => h === "rank");
  if (wordIdx < 0 || rankIdx < 0) throw new Error(`Bad header: ${header.join(", ")}`);

  const rows = [];
  for (let i = headerLineIdx + 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const w = (cols[wordIdx] || "").trim();
    const r = Number((cols[rankIdx] || "").trim());
    if (!w || !Number.isFinite(r)) continue;
    rows.push({ rank: r, word: w });
  }

  rows.sort((a, b) => a.rank - b.rank);
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    // Normalize slashes for later Kaikki lookup.
    const w = row.word.replace(/\s+\/\s+/g, " / ").trim();
    const key = w.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

function writeBook(outDir, title, start, end, entries) {
  // Windows filename sanitization
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_");
  const rangeName = `${start}~${end} ${safeTitle}`;
  const tsvPath = path.join(outDir, `${rangeName}.generated.tsv`);
  const txtPath = path.join(outDir, `${rangeName}.txt`);

  const tsv = ["index\ten\tko"];
  const txt = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    tsv.push(`${i + 1}\t${e.en}\t${e.ko.replace(/\t/g, " ").trim()}`);
    txt.push(`${e.en}\t${e.ko}`);
  }
  fs.writeFileSync(tsvPath, tsv.join("\n") + "\n", "utf8");
  fs.writeFileSync(txtPath, txt.join("\n") + "\n", "utf8");

  return { tsvPath, txtPath };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.in || !args.title || !args.outDir) {
    process.stdout.write(
      [
        "Usage:",
        "  node scripts/build-wordbooks-ko-from-stats-csv.mjs --in <stats.csv> --title <title> --outDir <dir> [--chunk 300] [--max 2400] [--concurrency 6] [--minBooks 1]",
        "",
      ].join("\n"),
    );
    process.exit(args.help ? 0 : 2);
  }

  const inPath = path.resolve(process.cwd(), args.in);
  const outDir = path.resolve(process.cwd(), args.outDir);
  const cacheDir = path.resolve(process.cwd(), args.cacheDir);

  if (!Number.isFinite(args.chunk) || args.chunk <= 0) throw new Error("--chunk must be > 0");
  if (!Number.isFinite(args.max) || args.max <= 0) throw new Error("--max must be > 0");

  ensureDir(outDir);
  ensureDir(cacheDir);

  const csvText = fs.readFileSync(inPath, "utf8");
  const ranked = loadRankedWords(csvText);

  // Cap the lookup set, but because we drop words without KO, we over-fetch.
  const lookups = ranked.slice(0, Math.min(ranked.length, args.max * 2));
  const results = await fetchKoForWords({
    words: lookups,
    cacheDir,
    userAgent: args.userAgent,
    concurrency: args.concurrency,
  });

  const filled = results
    .map((r) => ({ en: r.en, ko: (r.ko || "").trim() }))
    .filter((r) => r.ko.length > 0);

  // De-dupe and keep order.
  const seen = new Set();
  const entries = [];
  for (const r of filled) {
    const key = r.en.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(r);
    if (entries.length >= args.max) break;
  }

  if (entries.length < args.chunk) {
    // Not enough usable content; delete outputs in this outDir (but only under that dir).
    for (const f of fs.readdirSync(outDir)) {
      if (f.endsWith(".generated.tsv") || f.endsWith(".txt")) {
        fs.rmSync(path.join(outDir, f), { force: true });
      }
    }
    throw new Error(`Not enough en+ko entries (have ${entries.length}, need >= ${args.chunk}).`);
  }

  let books = 0;
  for (let start = 1; start <= entries.length; start += args.chunk) {
    const end = Math.min(start + args.chunk - 1, entries.length);
    const slice = entries.slice(start - 1, end);
    const { tsvPath } = writeBook(outDir, args.title, start, end, slice);
    books++;
    process.stdout.write(`Built: ${path.relative(process.cwd(), tsvPath)} (${slice.length})\n`);
  }

  if (books < args.minBooks) {
    // Quality gate: if we didn't produce enough books, remove them.
    for (const f of fs.readdirSync(outDir)) {
      if (f.endsWith(".generated.tsv") || f.endsWith(".txt")) {
        fs.rmSync(path.join(outDir, f), { force: true });
      }
    }
    throw new Error(`Quality gate failed: books=${books} < minBooks=${args.minBooks}`);
  }

  process.stdout.write(`Done. entries=${entries.length} books=${books}\n`);
}

main().catch((err) => {
  process.stderr.write(String(err?.stack || err) + "\n");
  process.exit(1);
});
