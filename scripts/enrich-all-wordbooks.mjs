#!/usr/bin/env node
/**
 * Enrich all generated wordbooks under data/wordbooks/**\/*.generated.tsv
 * and write outputs under data/wordbooks-ko/ mirroring the directory structure.
 *
 * If a wordbook fails the quality gate (min KO fill), its output is deleted
 * and the run continues.
 *
 * Usage:
 *   node scripts/enrich-all-wordbooks.mjs
 *   node scripts/enrich-all-wordbooks.mjs --minFill 0.5 --concurrency 6
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function parseArgs(argv) {
  const args = { minFill: 0.6, concurrency: 4 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--minFill" && i + 1 < argv.length) args.minFill = Number(argv[++i]);
    else if (a === "--concurrency" && i + 1 < argv.length) args.concurrency = Number(argv[++i]);
    else if (a === "-h" || a === "--help") args.help = true;
    else throw new Error(`Unknown arg: ${a}`);
  }
  return args;
}

function walk(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else out.push(p);
    }
  }
  return out;
}

function runNode(script, args) {
  const p = spawnSync(process.execPath, [script, ...args], { stdio: "inherit" });
  return p.status || 0;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(
      [
        "Usage:",
        "  node scripts/enrich-all-wordbooks.mjs [--minFill 0.6] [--concurrency 4]",
        "",
      ].join("\n"),
    );
    return;
  }

  const root = path.join(process.cwd(), "data", "wordbooks");
  const files = walk(root).filter((p) => p.endsWith(".generated.tsv"));
  if (!files.length) {
    process.stderr.write(`No generated TSVs found under ${root}\n`);
    process.exit(2);
  }

  let ok = 0;
  let fail = 0;

  for (const inPathAbs of files) {
    const rel = path.relative(path.join(process.cwd(), "data", "wordbooks"), inPathAbs);
    const outPathAbs = path.join(process.cwd(), "data", "wordbooks-ko", rel);

    const status = runNode(path.join("scripts", "enrich-kaikki-ko.mjs"), [
      "--in",
      path.relative(process.cwd(), inPathAbs),
      "--out",
      path.relative(process.cwd(), outPathAbs),
      "--minFill",
      String(args.minFill),
      "--concurrency",
      String(args.concurrency),
    ]);

    if (status === 0) ok++;
    else {
      fail++;
      process.stderr.write(`Skip (failed QC): ${rel}\n`);
    }
  }

  process.stdout.write(`Done. ok=${ok} failed=${fail}\n`);
}

main();

