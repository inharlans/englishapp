#!/usr/bin/env node
/**
 * Extract a best-effort word/phrase list from the MOEL xlsx file downloaded from NGSL Project.
 *
 * Input:
 *   data/crawled/ngsl-family/moel/*.xlsx
 *
 * Output:
 *   data/extracted/moel/moel.wordlist.txt (one entry per line)
 *
 * Usage:
 *   node scripts/data/extract-moel-xlsx.mjs
 *   node scripts/data/extract-moel-xlsx.mjs --in <xlsx> --out <txt>
 */

import fs from "node:fs";
import path from "node:path";
import xlsx from "xlsx";

function parseArgs(argv) {
  const args = {
    in: null,
    out: "data/extracted/moel/moel.wordlist.txt",
    sheet: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--in" && i + 1 < argv.length) args.in = argv[++i];
    else if (a === "--out" && i + 1 < argv.length) args.out = argv[++i];
    else if (a === "--sheet" && i + 1 < argv.length) args.sheet = argv[++i];
    else if (a === "-h" || a === "--help") args.help = true;
    else throw new Error(`Unknown arg: ${a}`);
  }
  return args;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function pickDefaultMoelXlsx() {
  const dir = path.join(process.cwd(), "data", "crawled", "ngsl-family", "moel");
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((n) => n.toLowerCase().endsWith(".xlsx"));
  files.sort((a, b) => a.localeCompare(b, "en"));
  if (!files.length) return null;
  return path.join(dir, files[0]);
}

function normalizeEntry(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'");
}

function isCandidate(s) {
  if (!s) return false;
  if (s.length < 2) return false;
  // must contain at least one ASCII letter
  if (!/[A-Za-z]/.test(s)) return false;
  // exclude obvious notes/headers
  if (s.length > 80) return false;
  if (/^https?:\/\//i.test(s)) return false;
  return true;
}

function extractBestColumn(rows) {
  // rows: array of arrays (header row included)
  // Find the column with the highest number of plausible entries.
  let best = { col: -1, score: 0 };
  const maxCols = Math.max(...rows.map((r) => r.length));
  for (let c = 0; c < maxCols; c++) {
    let score = 0;
    for (let r = 0; r < rows.length; r++) {
      const v = normalizeEntry(rows[r][c]);
      if (!isCandidate(v)) continue;
      score++;
    }
    if (score > best.score) best = { col: c, score };
  }
  return best.col;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(
      [
        "Usage:",
        "  node scripts/data/extract-moel-xlsx.mjs [--in <xlsx>] [--out <txt>] [--sheet <name>]",
        "",
      ].join("\n"),
    );
    return;
  }

  const inPath = path.resolve(process.cwd(), args.in || pickDefaultMoelXlsx() || "");
  if (!inPath || !fs.existsSync(inPath)) {
    throw new Error("MOEL xlsx not found. Run: node scripts/data/crawl-ngsl-family.mjs");
  }

  const wb = xlsx.readFile(inPath, { cellDates: false });
  const sheetName = args.sheet || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet not found: ${sheetName}`);

  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, raw: true });
  if (!rows.length) throw new Error("Empty sheet");

  const col = extractBestColumn(rows);
  if (col < 0) throw new Error("Could not find a suitable column");

  const seen = new Set();
  const out = [];
  for (let r = 0; r < rows.length; r++) {
    const v = normalizeEntry(rows[r][col]);
    if (!isCandidate(v)) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }

  if (out.length < 200) {
    throw new Error(`Extraction too small (${out.length}). Try specifying --sheet or inspect the xlsx.`);
  }

  const outPath = path.resolve(process.cwd(), args.out);
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, out.join("\n") + "\n", "utf8");
  process.stdout.write(
    `Extracted ${out.length} entries from ${path.basename(inPath)} (sheet=${sheetName}, col=${col}) -> ${path.relative(
      process.cwd(),
      outPath,
    )}\n`,
  );
}

main();

