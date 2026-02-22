#!/usr/bin/env node
/**
 * Enrich a words.tsv-shaped file (index,en,ko) by filling `ko` using Kaikki/Wiktionary
 * translations for Korean.
 *
 * Data source: https://kaikki.org (derived from Wiktionary; CC BY-SA 4.0 / GFDL).
 *
 * Usage:
 *   node scripts/data/enrich-kaikki-ko.mjs --in data/wordbooks/ngsl/1~500\ NGSL\ 1.2.generated.tsv --out data/wordbooks-ko/ngsl/1~500\ NGSL\ 1.2.generated.tsv
 *
 * Notes:
 * - This keeps the existing `en` as the lookup term. If Kaikki has no KO translations,
 *   the row's ko remains empty.
 * - Results are cached under data/cache/kaikki/ to avoid re-downloading.
 */

import fs from "node:fs";
import path from "node:path";
import { ensureDir, fetchKoForWords } from "../lib/kaikki-ko.mjs";

function parseArgs(argv) {
  const args = {
    in: null,
    out: null,
    cacheDir: "data/cache/kaikki",
    concurrency: 4,
    minFill: 0.6,
    userAgent: "englishapp-wordbook/1.0 (kaikki.org; wiktionary-derived)",
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--in" && i + 1 < argv.length) args.in = argv[++i];
    else if (a === "--out" && i + 1 < argv.length) args.out = argv[++i];
    else if (a === "--cacheDir" && i + 1 < argv.length) args.cacheDir = argv[++i];
    else if (a === "--concurrency" && i + 1 < argv.length) args.concurrency = Number(argv[++i]);
    else if (a === "--minFill" && i + 1 < argv.length) args.minFill = Number(argv[++i]);
    else if (a === "-h" || a === "--help") args.help = true;
    else throw new Error(`Unknown arg: ${a}`);
  }
  return args;
}

function parseTsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length);
  if (!lines.length) throw new Error("Empty TSV");
  const header = lines[0].split("\t");
  const idxIndex = header.indexOf("index");
  const idxEn = header.indexOf("en");
  const idxKo = header.indexOf("ko");
  if (idxIndex < 0 || idxEn < 0 || idxKo < 0) {
    throw new Error(`TSV header must include index,en,ko (got: ${header.join(",")})`);
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    const index = cols[idxIndex] || "";
    const en = (cols[idxEn] || "").trim();
    const ko = (cols[idxKo] || "").trim();
    if (!en) continue;
    rows.push({ index, en, ko });
  }
  return rows;
}

function toTsv(rows) {
  const out = ["index\ten\tko"];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    out.push(`${i + 1}\t${r.en}\t${(r.ko || "").replace(/\t/g, " ").trim()}`);
  }
  return out.join("\n") + "\n";
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.in || !args.out) {
    process.stdout.write(
      [
        "Usage:",
        "  node scripts/data/enrich-kaikki-ko.mjs --in <input.tsv> --out <output.tsv> [--cacheDir data/cache/kaikki] [--concurrency 4] [--minFill 0.6]",
        "",
      ].join("\n"),
    );
    process.exit(args.help ? 0 : 2);
  }

  const inPath = path.resolve(process.cwd(), args.in);
  const outPath = path.resolve(process.cwd(), args.out);
  ensureDir(path.dirname(outPath));
  ensureDir(path.resolve(process.cwd(), args.cacheDir));

  const rows = parseTsv(fs.readFileSync(inPath, "utf8"));
  const cacheDirAbs = path.resolve(process.cwd(), args.cacheDir);
  const lookups = rows.map((r) => r.en);
  const results = await fetchKoForWords({
    words: lookups,
    cacheDir: cacheDirAbs,
    userAgent: args.userAgent,
    concurrency: args.concurrency,
  });
  const byEn = new Map(results.map((r) => [r.en, r.ko]));
  const enriched = rows.map((r) => (r.ko ? r : { ...r, ko: byEn.get(r.en) || "" }));

  const filled = enriched.filter((r) => r.ko && r.ko.trim().length).length;
  const ratio = enriched.length ? filled / enriched.length : 0;

  fs.writeFileSync(outPath, toTsv(enriched), "utf8");
  process.stdout.write(
    `Wrote: ${path.relative(process.cwd(), outPath)} (filled ${filled}/${enriched.length} = ${(ratio * 100).toFixed(1)}%)\n`,
  );

  if (ratio < args.minFill) {
    // If it's not good enough for practical use, delete it to avoid "bad" datasets accumulating.
    fs.rmSync(outPath, { force: true });
    throw new Error(
      `Quality gate failed (filled ${(ratio * 100).toFixed(1)}% < ${(args.minFill * 100).toFixed(
        1,
      )}%). Deleted ${outPath}`,
    );
  }
}

main().catch((err) => {
  process.stderr.write(String(err?.stack || err) + "\n");
  process.exit(1);
});
