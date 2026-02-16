#!/usr/bin/env node
/**
 * End-to-end generator: download sources and build at least 5 wordbooks.
 *
 * Default behavior:
 * - Crawl NGSL-family stats CSVs into data/crawled/ngsl-family/
 * - Build 5 NGSL range books: 1~500, 501~1000, 1001~1500, 1501~2000, 2001~2500
 *
 * Usage:
 *   node scripts/generate-5-wordbooks.mjs
 */

import path from "node:path";
import { spawnSync } from "node:child_process";

function runNode(script, args) {
  const p = spawnSync(process.execPath, [script, ...args], { stdio: "inherit" });
  if (p.status !== 0) process.exit(p.status || 1);
}

function main() {
  runNode(path.join("scripts", "crawl-ngsl-family.mjs"), []);

  // The crawler preserves the remote filename, which is currently "NGSL_1.2_stats.csv".
  const ngslCsv = path.join("data", "crawled", "ngsl-family", "ngsl", "NGSL_1.2_stats.csv");
  runNode(path.join("scripts", "build-wordbooks-from-stats-csv.mjs"), [
    "--in",
    ngslCsv,
    "--title",
    "NGSL 1.2",
    "--outDir",
    path.join("data", "wordbooks", "ngsl"),
    "--chunk",
    "500",
    "--max",
    "2500",
  ]);
}

main();
