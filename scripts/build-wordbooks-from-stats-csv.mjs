#!/usr/bin/env node
/**
 * Build wordbook files from an NGSL-family "stats.csv" file.
 *
 * Input header example:
 *   Lemma,SFI Rank,SFI,Adjusted Frequency per Million (U)
 *
 * Output:
 * - Range wordbook text files: "1~500 <title>.txt" (one word per line)
 * - Range TSV files compatible with this repo's seeding: "1~500 <title>.generated.tsv"
 *
 * Usage:
 *   node scripts/build-wordbooks-from-stats-csv.mjs --in data/crawled/ngsl-family/ngsl/NGSL_12_stats.csv --title "NGSL 1.2" --outDir data/wordbooks/ngsl --chunk 500 --max 2500
 */

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { in: null, title: null, outDir: null, chunk: 500, max: 2500 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--in" && i + 1 < argv.length) args.in = argv[++i];
    else if (a === "--title" && i + 1 < argv.length) args.title = argv[++i];
    else if (a === "--outDir" && i + 1 < argv.length) args.outDir = argv[++i];
    else if (a === "--chunk" && i + 1 < argv.length) args.chunk = Number(argv[++i]);
    else if (a === "--max" && i + 1 < argv.length) args.max = Number(argv[++i]);
    else if (a === "-h" || a === "--help") args.help = true;
    else throw new Error(`Unknown arg: ${a}`);
  }
  return args;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function parseCsvLine(line) {
  // Minimal CSV parser with quotes support.
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

function loadRankedLemmas(csvText) {
  const lines = csvText.split(/\r?\n/).filter((l) => l && l.trim().length);
  if (!lines.length) throw new Error("Empty CSV");

  // Some files have description lines before the header (e.g., FEL). Find the first plausible header.
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
  if (!header) throw new Error("Could not find a header row with Word/Lemma + Rank columns");

  const lcHeader = header.map((h) => h.toLowerCase());
  const wordIdx = lcHeader.findIndex((h) => h === "lemma" || h === "word");

  // Prefer "SFI Rank" if present, otherwise any "* Rank", otherwise "Rank".
  let rankIdx = lcHeader.findIndex((h) => h === "sfi rank");
  if (rankIdx < 0) rankIdx = lcHeader.findIndex((h) => h.endsWith(" rank") && h !== "sfi rank");
  if (rankIdx < 0) rankIdx = lcHeader.findIndex((h) => h === "rank");
  if (wordIdx < 0 || rankIdx < 0) {
    throw new Error(`Expected columns Word/Lemma + Rank, got: ${header.join(", ")}`);
  }

  const rows = [];
  for (let i = headerLineIdx + 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const lemma = (cols[wordIdx] || "").trim();
    const rank = Number((cols[rankIdx] || "").trim());
    if (!lemma || !Number.isFinite(rank)) continue;
    rows.push({ rank, lemma });
  }

  rows.sort((a, b) => a.rank - b.rank);
  // De-dupe by lemma (case-insensitive) while preserving best rank.
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const key = r.lemma.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r.lemma);
  }
  return out;
}

function writeRangeFiles({ outDir, title, words, start, end }) {
  const rangeName = `${start}~${end} ${title}`;
  const txtPath = path.join(outDir, `${rangeName}.txt`);
  const tsvPath = path.join(outDir, `${rangeName}.generated.tsv`);

  const slice = words.slice(start - 1, end);

  // Text: one word per line
  fs.writeFileSync(txtPath, slice.join("\n") + "\n", "utf8");

  // TSV: index/en/ko, with blank ko (meaning enrichment can be a later step)
  const tsv = ["index\ten\tko"];
  for (let i = 0; i < slice.length; i++) {
    tsv.push(`${i + 1}\t${slice[i]}\t`);
  }
  fs.writeFileSync(tsvPath, tsv.join("\n") + "\n", "utf8");

  return { txtPath, tsvPath, count: slice.length };
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.in || !args.title || !args.outDir) {
    process.stdout.write(
      [
        "Usage:",
        "  node scripts/build-wordbooks-from-stats-csv.mjs --in <stats.csv> --title <title> --outDir <dir> [--chunk 500] [--max 2500]",
        "",
      ].join("\n"),
    );
    process.exit(args.help ? 0 : 2);
  }

  if (!Number.isFinite(args.chunk) || args.chunk <= 0) throw new Error("--chunk must be > 0");
  if (!Number.isFinite(args.max) || args.max <= 0) throw new Error("--max must be > 0");

  const inPath = path.resolve(process.cwd(), args.in);
  const outDir = path.resolve(process.cwd(), args.outDir);
  ensureDir(outDir);

  const csvText = fs.readFileSync(inPath, "utf8");
  const words = loadRankedLemmas(csvText);
  const max = Math.min(args.max, words.length);

  let made = 0;
  for (let start = 1; start <= max; start += args.chunk) {
    const end = Math.min(start + args.chunk - 1, max);
    const { txtPath, tsvPath, count } = writeRangeFiles({
      outDir,
      title: args.title,
      words,
      start,
      end,
    });
    made++;
    process.stdout.write(
      `Built: ${path.relative(process.cwd(), txtPath)} + ${path.relative(process.cwd(), tsvPath)} (${count})\n`,
    );
  }

  process.stdout.write(`Done. books=${made}\n`);
}

main();
