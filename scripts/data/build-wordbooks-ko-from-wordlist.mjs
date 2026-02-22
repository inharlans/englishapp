#!/usr/bin/env node
/**
 * Build FULL en+ko wordbooks from a plain word/phrase list.
 *
 * Input:
 *   a UTF-8 text file with one entry per line (optionally with leading numbers)
 *
 * Output:
 *   data/wordbooks-ko/<slug>/"<start>~<end> <title>.generated.tsv"
 *
 * QC:
 * - Only keep entries that Kaikki provides Korean translations for.
 * - If not enough entries for 1 chunk, delete outputs in outDir and fail.
 *
 * Usage:
 *   node scripts/data/build-wordbooks-ko-from-wordlist.mjs --in data/extracted/moel/moel.wordlist.txt --title "MOEL 1.0" --outDir data/wordbooks-ko/moel --chunk 150 --max 600
 */

import fs from "node:fs";
import path from "node:path";
import { ensureDir, fetchKoForWords } from "../lib/kaikki-ko.mjs";

function parseArgs(argv) {
  const args = {
    in: null,
    title: null,
    outDir: null,
    chunk: 150,
    max: 600,
    concurrency: 6,
    cacheDir: "data/cache/kaikki",
    userAgent: "englishapp-wordbook/1.0 (kaikki.org; wiktionary-derived)",
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
    else if (a === "-h" || a === "--help") args.help = true;
    else throw new Error(`Unknown arg: ${a}`);
  }
  return args;
}

function normalizeLine(line) {
  let s = String(line || "").trim();
  if (!s) return "";
  // Remove leading "1 " or "1." etc.
  s = s.replace(/^\d+\s*[.)-]?\s*/g, "");
  s = s.replace(/\s+/g, " ");
  return s;
}

function loadList(p) {
  const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    const w = normalizeLine(line);
    if (!w) continue;
    const key = w.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

function writeBook(outDir, title, start, end, entries) {
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_");
  const rangeName = `${start}~${end} ${safeTitle}`;
  const tsvPath = path.join(outDir, `${rangeName}.generated.tsv`);
  const txtPath = path.join(outDir, `${rangeName}.txt`);

  const tsv = ["index\ten\tko"];
  const txt = [];
  for (let i = 0; i < entries.length; i++) {
    tsv.push(`${i + 1}\t${entries[i].en}\t${entries[i].ko.replace(/\t/g, " ").trim()}`);
    txt.push(`${entries[i].en}\t${entries[i].ko}`);
  }
  fs.writeFileSync(tsvPath, tsv.join("\n") + "\n", "utf8");
  fs.writeFileSync(txtPath, txt.join("\n") + "\n", "utf8");
  return tsvPath;
}

function purgeOutputs(outDir) {
  if (!fs.existsSync(outDir)) return;
  for (const f of fs.readdirSync(outDir)) {
    if (f.endsWith(".generated.tsv") || f.endsWith(".txt")) fs.rmSync(path.join(outDir, f), { force: true });
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.in || !args.title || !args.outDir) {
    process.stdout.write(
      [
        "Usage:",
        "  node scripts/data/build-wordbooks-ko-from-wordlist.mjs --in <list.txt> --title <title> --outDir <dir> [--chunk 150] [--max 600]",
        "",
      ].join("\n"),
    );
    process.exit(args.help ? 0 : 2);
  }
  if (!Number.isFinite(args.chunk) || args.chunk <= 0) throw new Error("--chunk must be > 0");
  if (!Number.isFinite(args.max) || args.max <= 0) throw new Error("--max must be > 0");

  const inPath = path.resolve(process.cwd(), args.in);
  const outDir = path.resolve(process.cwd(), args.outDir);
  const cacheDir = path.resolve(process.cwd(), args.cacheDir);
  ensureDir(outDir);
  ensureDir(cacheDir);

  const list = loadList(inPath).slice(0, args.max * 2);
  const results = await fetchKoForWords({
    words: list,
    cacheDir,
    userAgent: args.userAgent,
    concurrency: args.concurrency,
  });

  const filled = results
    .map((r) => ({ en: r.en, ko: (r.ko || "").trim() }))
    .filter((r) => r.ko.length);

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
    purgeOutputs(outDir);
    throw new Error(`Not enough en+ko entries (have ${entries.length}, need >= ${args.chunk})`);
  }

  let books = 0;
  for (let start = 1; start <= entries.length; start += args.chunk) {
    const end = Math.min(start + args.chunk - 1, entries.length);
    const slice = entries.slice(start - 1, end);
    const tsvPath = writeBook(outDir, args.title, start, end, slice);
    books++;
    process.stdout.write(`Built: ${path.relative(process.cwd(), tsvPath)} (${slice.length})\n`);
  }

  process.stdout.write(`Done. entries=${entries.length} books=${books}\n`);
}

main().catch((err) => {
  process.stderr.write(String(err?.stack || err) + "\n");
  process.exit(1);
});

