#!/usr/bin/env node
/**
 * Merge files whose names include numeric ranges, preserving the original names
 * as inputs and producing a merged output name.
 *
 * Example:
 *   "1~100 토익 영단어.txt" + "101~200 토익 영단어.txt"
 *     -> "1~200 토익 영단어.txt"
 *
 * Usage:
 *   node scripts/merge-range-files.mjs --inDir data/crawled --outDir data/merged
 */

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { inDir: null, outDir: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--inDir" && i + 1 < argv.length) args.inDir = argv[++i];
    else if (a === "--outDir" && i + 1 < argv.length) args.outDir = argv[++i];
    else if (a === "-h" || a === "--help") args.help = true;
    else throw new Error(`Unknown arg: ${a}`);
  }
  return args;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function parseRangedFilename(name) {
  const ext = path.extname(name);
  const base = ext ? name.slice(0, -ext.length) : name;

  // Accept "1~100 ...", "1-100 ...", "1 – 100 ..." etc.
  const m = base.match(/^\s*(\d+)\s*(?:~|-|–|—)\s*(\d+)\s*(.*)\s*$/);
  if (!m) return null;

  const start = Number(m[1]);
  const end = Number(m[2]);
  const rest = (m[3] || "").trim();
  if (!Number.isFinite(start) || !Number.isFinite(end) || !rest) return null;

  return { start, end, rest, ext };
}

function buildMergedName(start, end, rest, ext) {
  return `${start}~${end} ${rest}${ext}`;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.inDir || !args.outDir) {
    process.stdout.write(
      [
        "Usage:",
        "  node scripts/merge-range-files.mjs --inDir <dir> --outDir <dir>",
        "",
      ].join("\n"),
    );
    process.exit(args.help ? 0 : 2);
  }

  const inDir = path.resolve(process.cwd(), args.inDir);
  const outDir = path.resolve(process.cwd(), args.outDir);
  ensureDir(outDir);

  const files = fs
    .readdirSync(inDir, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name);

  const groups = new Map(); // key -> [{...}]
  for (const name of files) {
    const meta = parseRangedFilename(name);
    if (!meta) continue;
    const key = `${meta.rest}||${meta.ext}`;
    const arr = groups.get(key) || [];
    arr.push({ name, ...meta });
    groups.set(key, arr);
  }

  let mergedCount = 0;

  for (const [key, arr] of groups.entries()) {
    arr.sort((a, b) => a.start - b.start || a.end - b.end);

    let cur = null; // { start,end,rest,ext,names:[] }

    const flush = () => {
      if (!cur) return;
      if (cur.names.length <= 1) {
        cur = null;
        return;
      }
      const outName = buildMergedName(cur.start, cur.end, cur.rest, cur.ext);
      const outPath = path.join(outDir, outName);

      const parts = [];
      for (const n of cur.names) {
        const p = path.join(inDir, n);
        const s = fs.readFileSync(p, "utf8");
        parts.push(s.replace(/\s+$/g, ""));
      }
      fs.writeFileSync(outPath, parts.join("\n\n") + "\n", "utf8");
      mergedCount++;
      process.stdout.write(`Merged -> ${outName}\n`);
      cur = null;
    };

    for (const f of arr) {
      if (!cur) {
        cur = { start: f.start, end: f.end, rest: f.rest, ext: f.ext, names: [f.name] };
        continue;
      }
      // Merge if overlapping or adjacent (e.g., 1~100 + 101~200).
      if (f.start <= cur.end + 1) {
        cur.end = Math.max(cur.end, f.end);
        cur.names.push(f.name);
      } else {
        flush();
        cur = { start: f.start, end: f.end, rest: f.rest, ext: f.ext, names: [f.name] };
      }
    }
    flush();
  }

  process.stdout.write(`Done. merged=${mergedCount}\n`);
}

main();

