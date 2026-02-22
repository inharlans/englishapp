#!/usr/bin/env node
/**
 * Generate many FULL en+ko wordbooks (ko in "(명)(동)..." style) from NGSL-family lists.
 *
 * This is the "better direction" for your requirement:
 * - Every row has en+ko.
 * - Low-quality sources are discarded automatically by QC.
 *
 * Usage:
 *   node scripts/data/generate-many-wordbooks-ko.mjs
 *   node scripts/data/generate-many-wordbooks-ko.mjs --chunk 300 --max 2100
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function parseArgs(argv) {
  const args = { chunk: 300, max: 2100, concurrency: 6, minBooksPerList: 1 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--chunk" && i + 1 < argv.length) args.chunk = Number(argv[++i]);
    else if (a === "--max" && i + 1 < argv.length) args.max = Number(argv[++i]);
    else if (a === "--concurrency" && i + 1 < argv.length) args.concurrency = Number(argv[++i]);
    else if (a === "--minBooksPerList" && i + 1 < argv.length)
      args.minBooksPerList = Number(argv[++i]);
    else if (a === "-h" || a === "--help") args.help = true;
    else throw new Error(`Unknown arg: ${a}`);
  }
  return args;
}

function runNode(script, args) {
  const p = spawnSync(process.execPath, [script, ...args], { stdio: "inherit" });
  return p.status || 0;
}

function findFirstStatsCsv(dir) {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((n) => /_stats\.csv$/i.test(n))
    .sort();
  if (!files.length) return null;
  return path.join(dir, files[0]);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(
      [
        "Usage:",
        "  node scripts/data/generate-many-wordbooks-ko.mjs [--chunk 300] [--max 2100] [--concurrency 6] [--minBooksPerList 1]",
        "",
      ].join("\n"),
    );
    return;
  }

  // Step 1: crawl open lists.
  runNode(path.join("scripts", "crawl-ngsl-family.mjs"), []);

  // Step 2: build KO wordbooks.
  const root = path.join(process.cwd(), "data", "crawled", "ngsl-family");
  const lists = [
    { slug: "ngsl", title: "초등/중등 기반 NGSL 1.2", max: 2400 },
    { slug: "tsl", title: "토익 기반 TSL 1.2", max: 1000 },
    { slug: "nawl", title: "고등/수능 기반 NAWL 1.2", max: 1000 },
    { slug: "ngsl-spoken", title: "회화 기반 NGSL-Spoken 1.2", max: 2000 },
    { slug: "bsl", title: "비즈니스 기반 BSL 1.20", max: 1000 },
    { slug: "fel", title: "의학/피트니스 기반 FEL 1.2", max: 1000 },
    { slug: "ndl", title: "초등 사이트워드 기반 NDL 1.1", max: 900 },
  ];

  let okLists = 0;
  let failedLists = 0;

  for (const l of lists) {
    const dir = path.join(root, l.slug);
    const csvAbs = findFirstStatsCsv(dir);
    if (!csvAbs) {
      process.stderr.write(`Skip ${l.slug}: no *_stats.csv\n`);
      failedLists++;
      continue;
    }

    const outDir = path.join("data", "wordbooks-ko", l.slug);
    const status = runNode(path.join("scripts", "build-wordbooks-ko-from-stats-csv.mjs"), [
      "--in",
      path.relative(process.cwd(), csvAbs),
      "--title",
      l.title,
      "--outDir",
      outDir,
      "--chunk",
      String(args.chunk),
      "--max",
      String(Math.min(args.max, l.max)),
      "--concurrency",
      String(args.concurrency),
      "--minBooks",
      String(args.minBooksPerList),
    ]);

    if (status === 0) okLists++;
    else {
      failedLists++;
      process.stderr.write(`List failed QC: ${l.slug}\n`);
    }
  }

  // Step 3 (optional): attempt MOEL xlsx extraction -> KO wordbooks.
  // If this fails QC (likely due to phrases not having KO translations), we just skip it.
  try {
    const status1 = runNode(path.join("scripts", "extract-moel-xlsx.mjs"), []);
    if (status1 === 0) {
      const status2 = runNode(path.join("scripts", "build-wordbooks-ko-from-wordlist.mjs"), [
        "--in",
        path.join("data", "extracted", "moel", "moel.wordlist.txt"),
        "--title",
        "의학 회화 기반 MOEL 1.0",
        "--outDir",
        path.join("data", "wordbooks-ko", "moel"),
        "--chunk",
        String(Math.max(100, Math.floor(args.chunk / 3))),
        "--max",
        "600",
        "--concurrency",
        String(args.concurrency),
      ]);
      if (status2 === 0) okLists++;
      else failedLists++;
    }
  } catch {
    failedLists++;
  }

  process.stdout.write(`Done. okLists=${okLists} failedLists=${failedLists}\n`);
}

main();
