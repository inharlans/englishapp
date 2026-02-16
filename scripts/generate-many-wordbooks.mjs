#!/usr/bin/env node
/**
 * Generate lots of wordbooks from NGSL-family open lists.
 *
 * Produces multiple wordbooks per list by rank ranges:
 *   1~500, 501~1000, ...
 *
 * Output structure:
 *   data/crawled/ngsl-family/<slug>/<original_filename>.csv
 *   data/wordbooks/<slug>/<range> <title>.txt
 *   data/wordbooks/<slug>/<range> <title>.generated.tsv
 *
 * Usage:
 *   node scripts/generate-many-wordbooks.mjs
 *   node scripts/generate-many-wordbooks.mjs --chunk 500
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function parseArgs(argv) {
  const args = { chunk: 500 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--chunk" && i + 1 < argv.length) args.chunk = Number(argv[++i]);
    else if (a === "-h" || a === "--help") args.help = true;
    else throw new Error(`Unknown arg: ${a}`);
  }
  return args;
}

function runNode(script, args) {
  const p = spawnSync(process.execPath, [script, ...args], { stdio: "inherit" });
  if (p.status !== 0) process.exit(p.status || 1);
}

function findFirstStatsCsv(dir) {
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
    process.stdout.write(["Usage:", "  node scripts/generate-many-wordbooks.mjs [--chunk 500]", ""].join("\n"));
    return;
  }

  if (!Number.isFinite(args.chunk) || args.chunk <= 0) throw new Error("--chunk must be > 0");

  runNode(path.join("scripts", "crawl-ngsl-family.mjs"), []);

  const root = path.join(process.cwd(), "data", "crawled", "ngsl-family");
  const lists = [
    { slug: "ngsl", title: "NGSL 1.2", max: 2500 },
    { slug: "tsl", title: "TSL 1.2 (TOEIC)", max: 1000 },
    { slug: "nawl", title: "NAWL 1.2 (Academic)", max: 1000 },
    { slug: "ngsl-spoken", title: "NGSL-Spoken 1.2", max: 2000 },
    { slug: "bsl", title: "BSL 1.20", max: 1000 },
    { slug: "fel", title: "FEL 1.2", max: 1000 },
  ];

  for (const l of lists) {
    const dir = path.join(root, l.slug);
    const csvPath = findFirstStatsCsv(dir);
    if (!csvPath) {
      process.stderr.write(`Skip ${l.slug}: no *_stats.csv found in ${dir}\n`);
      continue;
    }

    runNode(path.join("scripts", "build-wordbooks-from-stats-csv.mjs"), [
      "--in",
      path.relative(process.cwd(), csvPath),
      "--title",
      l.title,
      "--outDir",
      path.join("data", "wordbooks", l.slug),
      "--chunk",
      String(args.chunk),
      "--max",
      String(l.max),
    ]);
  }
}

main();

