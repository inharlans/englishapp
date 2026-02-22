#!/usr/bin/env node
/**
 * Crawl a small set of explicitly-licensed vocabulary sources and store them
 * under data/crawled/ preserving original filenames.
 *
 * Currently:
 * - NGSL "TOEIC Service List" (TSL) 1.1 alphabetized list (CC BY-SA 4.0).
 *
 * Usage:
 *   node scripts/data/crawl-tsl.mjs
 *   node scripts/data/crawl-tsl.mjs --outDir data/crawled/ngsl
 */

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { outDir: "data/crawled/ngsl" };
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

async function downloadTo(url, outPath) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  const ab = await res.arrayBuffer();
  fs.writeFileSync(outPath, Buffer.from(ab));
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(
      ["Usage:", "  node scripts/data/crawl-tsl.mjs [--outDir data/crawled/ngsl]", ""].join("\n"),
    );
    return;
  }

  const outDir = path.resolve(process.cwd(), args.outDir);
  ensureDir(outDir);

  // Source: https://www.newgeneralservicelist.org/toeic-service-list/
  // License: CC BY-SA 4.0 (as stated on the site).
  const urls = [
    // Observed on the TSL page link target (can change over time).
    "http://www.newgeneralservicelist.org/wp-content/uploads/2020/09/tsl_11_alphabetized_description.txt",
    "https://www.newgeneralservicelist.org/wp-content/uploads/2020/09/tsl_11_alphabetized_description.txt",
    // Fallbacks (older paths)
    "http://www.newgeneralservicelist.org/wp-content/uploads/2019/02/tsl_11_alphabetized_description.txt",
    "https://www.newgeneralservicelist.org/wp-content/uploads/2019/02/tsl_11_alphabetized_description.txt",
  ];

  let lastErr = null;
  for (const url of urls) {
    try {
      const filename = path.basename(new URL(url).pathname);
      const outPath = path.join(outDir, filename);
      await downloadTo(url, outPath);
      process.stdout.write(`Saved: ${outPath}\n`);
      return;
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("All download attempts failed");
}

main().catch((err) => {
  process.stderr.write(String(err?.stack || err) + "\n");
  process.exit(1);
});
