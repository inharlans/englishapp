#!/usr/bin/env node
/**
 * Generate a project-root TSV compatible with seeding, but with KO meanings filled:
 * - output: words.ko.generated.tsv (index,en,ko)
 *
 * This does NOT overwrite words.tsv automatically.
 *
 * Usage:
 *   node scripts/generate-root-words-tsv-ko.mjs --count 1500
 */

import fs from "node:fs";
import path from "node:path";
import { ensureDir, fetchKoForWords } from "./lib/kaikki-ko.mjs";

function parseArgs(argv) {
  const args = { count: 1500, concurrency: 6, cacheDir: "data/cache/kaikki" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--count" && i + 1 < argv.length) args.count = Number(argv[++i]);
    else if (a === "--concurrency" && i + 1 < argv.length) args.concurrency = Number(argv[++i]);
    else if (a === "--cacheDir" && i + 1 < argv.length) args.cacheDir = argv[++i];
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
        } else inQ = false;
      } else cur += ch;
    } else {
      if (ch === ",") {
        out.push(cur);
        cur = "";
      } else if (ch === '"') inQ = true;
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function loadNgslWords(csvPath) {
  const text = fs.readFileSync(csvPath, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l && l.trim().length);
  const header = parseCsvLine(lines[0]).map((s) => s.trim().toLowerCase());
  const lemmaIdx = header.indexOf("lemma");
  const rankIdx = header.indexOf("sfi rank");
  if (lemmaIdx < 0 || rankIdx < 0) throw new Error("Unexpected NGSL header");

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const w = (cols[lemmaIdx] || "").trim();
    const r = Number((cols[rankIdx] || "").trim());
    if (!w || !Number.isFinite(r)) continue;
    rows.push({ r, w });
  }
  rows.sort((a, b) => a.r - b.r);
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const k = row.w.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(row.w);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(["Usage:", "  node scripts/generate-root-words-tsv-ko.mjs [--count 1500]", ""].join("\n"));
    return;
  }
  if (!Number.isFinite(args.count) || args.count <= 0) throw new Error("--count must be > 0");

  const ngslCsv = path.join("data", "crawled", "ngsl-family", "ngsl", "NGSL_1.2_stats.csv");
  if (!fs.existsSync(ngslCsv)) {
    throw new Error(`Missing ${ngslCsv}. Run: node scripts/crawl-ngsl-family.mjs`);
  }

  const words = loadNgslWords(ngslCsv).slice(0, args.count * 2);
  const cacheDirAbs = path.resolve(process.cwd(), args.cacheDir);
  ensureDir(cacheDirAbs);

  const results = await fetchKoForWords({
    words,
    cacheDir: cacheDirAbs,
    userAgent: "englishapp-wordbook/1.0 (kaikki.org; wiktionary-derived)",
    concurrency: args.concurrency,
  });

  const filled = results.filter((r) => (r.ko || "").trim().length);
  const seen = new Set();
  const picked = [];
  for (const r of filled) {
    const k = r.en.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    picked.push({ en: r.en, ko: r.ko.trim() });
    if (picked.length >= args.count) break;
  }

  if (picked.length < args.count) {
    throw new Error(`Not enough KO-filled words: ${picked.length}/${args.count}`);
  }

  const out = ["index\ten\tko"];
  for (let i = 0; i < picked.length; i++) out.push(`${i + 1}\t${picked[i].en}\t${picked[i].ko}`);
  fs.writeFileSync("words.ko.generated.tsv", out.join("\n") + "\n", "utf8");
  process.stdout.write(`Wrote: words.ko.generated.tsv (${picked.length})\n`);
}

main().catch((err) => {
  process.stderr.write(String(err?.stack || err) + "\n");
  process.exit(1);
});

