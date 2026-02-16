#!/usr/bin/env node
/**
 * Download openly-licensed wordlist CSVs from newgeneralservicelist.com (CC BY-SA 4.0)
 * and store them under data/crawled/, preserving the remote filename.
 *
 * Lists included:
 * - NGSL 1.2
 * - TSL 1.2
 * - NAWL 1.2
 * - NGSL-Spoken 1.2
 * - BSL 1.20
 * - FEL 1.2
 * - NDL 1.1 (New Dolch List)
 * - MOEL 1.0 (Medical Oral English List) [xlsx]
 *
 * Usage:
 *   node scripts/crawl-ngsl-family.mjs
 *   node scripts/crawl-ngsl-family.mjs --outDir data/crawled/ngsl-family
 */

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { outDir: "data/crawled/ngsl-family" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--outDir" && i + 1 < argv.length) args.outDir = argv[++i];
    else if (a === "-h" || a === "--help") args.help = true;
    else throw new Error(`Unknown arg: ${a}`);
  }
  return args;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function download(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  const finalUrl = res.url || url;
  const ab = await res.arrayBuffer();
  return { finalUrl, buf: Buffer.from(ab) };
}

function filenameFromUrl(u) {
  const url = new URL(u);
  const base = path.basename(url.pathname);
  // Squarespace sometimes uses query params, but file name is still in pathname.
  return base || "download.bin";
}

async function downloadToDir(url, dir) {
  const { finalUrl, buf } = await download(url);
  const filename = filenameFromUrl(finalUrl);
  const outPath = path.join(dir, filename);
  fs.writeFileSync(outPath, buf);
  return { outPath, finalUrl };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(
      ["Usage:", "  node scripts/crawl-ngsl-family.mjs [--outDir data/crawled/ngsl-family]", ""].join(
        "\n",
      ),
    );
    return;
  }

  const outDir = path.resolve(process.cwd(), args.outDir);
  ensureDir(outDir);

  const jobs = [
    { slug: "ngsl", url: "https://www.newgeneralservicelist.com/s/NGSL_12_stats.csv" },
    { slug: "tsl", url: "https://www.newgeneralservicelist.com/s/TSL_12_stats.csv" },
    { slug: "nawl", url: "https://www.newgeneralservicelist.com/s/NAWL_12_stats.csv" },
    { slug: "ngsl-spoken", url: "https://www.newgeneralservicelist.com/s/NGSL-Spoken_12_stats.csv" },
    { slug: "bsl", url: "https://www.newgeneralservicelist.com/s/BSL_120_stats.csv" },
    { slug: "fel", url: "https://www.newgeneralservicelist.com/s/FEL_12_stats.csv" },
    { slug: "ndl", url: "https://www.newgeneralservicelist.com/s/NDL_11_stats.csv" },
    { slug: "moel", url: "https://www.newgeneralservicelist.com/s/Oral-English-Medical-Corpus.xlsx" },
  ];

  for (const j of jobs) {
    const dir = path.join(outDir, j.slug);
    ensureDir(dir);
    const { outPath, finalUrl } = await downloadToDir(j.url, dir);
    process.stdout.write(`Saved: ${path.relative(process.cwd(), outPath)} (from ${finalUrl})\n`);
  }
}

main().catch((err) => {
  process.stderr.write(String(err?.stack || err) + "\n");
  process.exit(1);
});
