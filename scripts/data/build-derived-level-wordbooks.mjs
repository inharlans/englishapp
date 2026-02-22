#!/usr/bin/env node
/**
 * Build "school level" derived wordbooks from existing KO wordbooks.
 *
 * Goal: provide 초등/중등/고등/수능/토익/회화/비즈니스/전문 영역 세트를
 * 모두 (명)(동)... 형태의 KO가 채워진 상태로.
 *
 * Inputs:
 * - data/wordbooks-ko/ngsl/*.generated.tsv
 * - data/wordbooks-ko/nawl/*.generated.tsv
 * - data/wordbooks-ko/tsl/*.generated.tsv
 * - data/wordbooks-ko/ngsl-spoken/*.generated.tsv
 * - data/wordbooks-ko/bsl/*.generated.tsv
 * - data/wordbooks-ko/fel/*.generated.tsv
 *
 * Outputs:
 * - data/wordbooks-ko/derived/*.generated.tsv
 *
 * Usage:
 *   node scripts/data/build-derived-level-wordbooks.mjs
 */

import fs from "node:fs";
import path from "node:path";

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function parseTsv(p) {
  const text = fs.readFileSync(p, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.length);
  const header = lines[0].split("\t");
  const idxEn = header.indexOf("en");
  const idxKo = header.indexOf("ko");
  if (idxEn < 0 || idxKo < 0) throw new Error(`Bad TSV header: ${p}`);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    const en = (cols[idxEn] || "").trim();
    const ko = (cols[idxKo] || "").trim();
    if (!en || !ko) continue;
    rows.push({ en, ko });
  }
  return rows;
}

function loadAll(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((n) => n.endsWith(".generated.tsv"));
  files.sort((a, b) => a.localeCompare(b, "en"));
  const out = [];
  for (const f of files) out.push(...parseTsv(path.join(dir, f)));
  // de-dupe while preserving first occurrence (ranked lists already ordered)
  const seen = new Set();
  const deduped = [];
  for (const r of out) {
    const k = r.en.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(r);
  }
  return deduped;
}

function writeTsv(outPath, title, rows) {
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_");
  const header = ["index\ten\tko"];
  const lines = [];
  for (let i = 0; i < rows.length; i++) {
    lines.push(`${i + 1}\t${rows[i].en}\t${rows[i].ko.replace(/\t/g, " ").trim()}`);
  }
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, header.concat(lines).join("\n") + "\n", "utf8");
  return safeTitle;
}

function main() {
  const base = path.join(process.cwd(), "data", "wordbooks-ko");
  const outDir = path.join(base, "derived");
  ensureDir(outDir);

  const ngsl = loadAll(path.join(base, "ngsl"));
  const nawl = loadAll(path.join(base, "nawl"));
  const tsl = loadAll(path.join(base, "tsl"));
  const spoken = loadAll(path.join(base, "ngsl-spoken"));
  const bsl = loadAll(path.join(base, "bsl"));
  const fel = loadAll(path.join(base, "fel"));
  const ndl = loadAll(path.join(base, "ndl"));
  const moel = loadAll(path.join(base, "moel"));

  // Derived sets (sizes chosen to feel like real "books").
  const sets = [
    { name: "1~800 초등 영단어(추천)", rows: ngsl.slice(0, 800) },
    { name: "801~1500 중등 영단어(추천)", rows: ngsl.slice(800, 1500) },
    { name: "1501~2100 고등 영단어(추천)", rows: ngsl.slice(1500, 2100) },
    { name: "1~800 초등 사이트워드(추천) NDL", rows: ndl.slice(0, 800) },
    { name: "1~551 수능 심화(추천) Academic", rows: nawl.slice(0, 551) },
    { name: "1~731 토익 핵심(추천) TOEIC", rows: tsl.slice(0, 731) },
    { name: "1~675 회화 핵심(추천) Spoken", rows: spoken.slice(0, 675) },
    { name: "1~895 비즈니스 핵심(추천) Business", rows: bsl.slice(0, 895) },
    { name: "1~357 의학_피트니스(추천) Fitness", rows: fel.slice(0, 357) },
    { name: `1~${Math.min(336, moel.length)} 의료 회화(추천) MOEL`, rows: moel.slice(0, 336) },
  ];

  // Basic QC: ensure we never output empty.
  let made = 0;
  for (const s of sets) {
    if (!s.rows.length) continue;
    const outPath = path.join(outDir, `${s.name}.generated.tsv`);
    writeTsv(outPath, s.name, s.rows);
    made++;
    process.stdout.write(`Built: ${path.relative(process.cwd(), outPath)} (${s.rows.length})\n`);
  }

  process.stdout.write(`Done. derived=${made}\n`);
}

main();
