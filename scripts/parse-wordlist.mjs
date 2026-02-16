#!/usr/bin/env node
/**
 * Parse plain-text vocab lines into the project's words.tsv format.
 *
 * Input line examples:
 *   1 executive 1 (명)경영진, 임원(형)경영의, 운영의
 *   2 inventory 2 (명)재고, 재고 목록(명)재고 조사
 *
 * Output TSV columns:
 *   index  en  ko
 *
 * Usage:
 *   node scripts/parse-wordlist.mjs --in input.txt --out words.generated.tsv
 *   type input.txt | node scripts/parse-wordlist.mjs > words.generated.tsv
 */

import fs from "node:fs";

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

function decodeText(buf) {
  if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);

  // BOM sniff
  if (buf.length >= 2) {
    const b0 = buf[0];
    const b1 = buf[1];
    // UTF-16LE BOM: FF FE
    if (b0 === 0xff && b1 === 0xfe) return new TextDecoder("utf-16le").decode(buf.slice(2));
    // UTF-16BE BOM: FE FF (rare here, but handle anyway)
    if (b0 === 0xfe && b1 === 0xff) return new TextDecoder("utf-16be").decode(buf.slice(2));
    // UTF-8 BOM: EF BB BF
    if (buf.length >= 3 && b0 === 0xef && b1 === 0xbb && buf[2] === 0xbf)
      return new TextDecoder("utf-8").decode(buf.slice(3));
  }

  // Heuristic: Windows PowerShell often pipes text to native apps as UTF-16LE.
  // If we see lots of NUL bytes, treat as UTF-16LE.
  let nul = 0;
  for (let i = 0; i < buf.length; i++) if (buf[i] === 0x00) nul++;
  if (nul > buf.length * 0.2) return new TextDecoder("utf-16le").decode(buf);

  return new TextDecoder("utf-8").decode(buf);
}

function normalizeKo(s) {
  // Prevent TSV breakage and keep display-friendly spacing.
  return s.replace(/\t/g, " ").replace(/\s+/g, " ").trim();
}

function parseLine(line) {
  const trimmed = line.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("#")) return null;

  const parts = trimmed.split(/\s+/);
  if (parts.length < 3) return null;

  const first = parts[0];
  const second = parts[1];
  if (!/^\d+$/.test(first)) return null;
  if (!/^[A-Za-z][A-Za-z'\-]*$/.test(second)) return null;

  const idx = Number(first);
  let restStart = 2;

  // Many sources repeat the index after the word: "1 executive 1 ..."
  if (parts.length >= 4 && /^\d+$/.test(parts[2])) restStart = 3;

  const koRaw = parts.slice(restStart).join(" ");
  const ko = normalizeKo(koRaw);
  if (!ko) return null;

  return { idx, en: second, ko };
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(
      [
        "Usage:",
        "  node scripts/parse-wordlist.mjs --in input.txt --out words.generated.tsv",
        "  type input.txt | node scripts/parse-wordlist.mjs > words.generated.tsv",
        "",
      ].join("\n"),
    );
    return;
  }

  const inputBuf = args.in ? fs.readFileSync(args.in) : fs.readFileSync(0);
  const input = decodeText(inputBuf);
  const lines = input.split(/\r?\n/);

  const seen = new Set();
  const rows = [];

  for (const line of lines) {
    const rec = parseLine(line);
    if (!rec) continue;
    const key = rec.en.toLowerCase();
    if (seen.has(key)) continue; // de-dupe by word
    seen.add(key);
    rows.push(rec);
  }

  // Re-number sequentially to keep a clean index column.
  const out = ["index\ten\tko"];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    out.push(`${i + 1}\t${r.en}\t${r.ko}`);
  }

  const tsv = out.join("\n") + "\n";
  if (args.out) fs.writeFileSync(args.out, tsv, "utf8");
  else process.stdout.write(tsv);
}

main();
