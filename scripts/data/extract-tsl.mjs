#!/usr/bin/env node
/**
 * Extract the word list from NGSL's TSL text file and emit a words.tsv-shaped file.
 *
 * Note: This produces an empty `ko` column (TSL doesn't include Korean meanings).
 *
 * Usage:
 *   node scripts/data/extract-tsl.mjs --in data/crawled/ngsl/tsl_11_alphabetized_description.txt --out data/extracted/tsl_11.words.generated.tsv
 */

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { in: null, out: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--in" && i + 1 < argv.length) args.in = argv[++i];
    else if (a === "--out" && i + 1 < argv.length) args.out = argv[++i];
    else if (a === "-h" || a === "--help") args.help = true;
    else throw new Error(`Unknown arg: ${a}`);
  }
  return args;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function extractNumberedWords(text) {
  // Matches patterns like: "1. abide", "1200. workforce"
  // Allows multiword entries and common punctuation in tokens.
  const re =
    /\b(\d{1,4})\.\s*([A-Za-z][A-Za-z'’-]*(?:[ -][A-Za-z][A-Za-z'’-]*)*)/g;
  const found = new Map(); // idx -> word (first seen)
  let m;
  while ((m = re.exec(text))) {
    const idx = Number(m[1]);
    const word = m[2].trim();
    if (!found.has(idx)) found.set(idx, word);
  }
  const idxs = Array.from(found.keys()).sort((a, b) => a - b);
  return idxs.map((i) => ({ idx: i, en: found.get(i) }));
}

function toWordsTsv(rows) {
  const out = ["index\ten\tko"];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    out.push(`${i + 1}\t${r.en}\t`);
  }
  return out.join("\n") + "\n";
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.in || !args.out) {
    process.stdout.write(
      [
        "Usage:",
        "  node scripts/data/extract-tsl.mjs --in <tsl_txt> --out <generated_tsv>",
        "",
      ].join("\n"),
    );
    process.exit(args.help ? 0 : 2);
  }

  const inPath = path.resolve(process.cwd(), args.in);
  const outPath = path.resolve(process.cwd(), args.out);

  const text = fs.readFileSync(inPath, "utf8");
  const rows = extractNumberedWords(text);
  if (!rows.length) throw new Error("No numbered words found in input");

  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, toWordsTsv(rows), "utf8");
  process.stdout.write(`Extracted ${rows.length} words -> ${outPath}\n`);
}

main();

