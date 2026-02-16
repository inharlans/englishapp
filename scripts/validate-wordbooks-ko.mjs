#!/usr/bin/env node
/**
 * Validate KO wordbooks under data/wordbooks-ko/**\/*.generated.tsv
 *
 * Checks:
 * - Header is exactly: index en ko
 * - Every row has en and ko
 * - ko begins with "(" and contains at least one "(명)/(동)/(형)/(부)" etc.
 *
 * Usage:
 *   node scripts/validate-wordbooks-ko.mjs
 *   node scripts/validate-wordbooks-ko.mjs --fixDelete
 *
 * If --fixDelete is set, invalid files are deleted (within data/wordbooks-ko only).
 */

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { fixDelete: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--fixDelete") args.fixDelete = true;
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

function validateFile(p) {
  const text = fs.readFileSync(p, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.length);
  if (!lines.length) return { ok: false, reason: "empty" };
  const header = lines[0].split("\t");
  if (header.length < 3 || header[0] !== "index" || header[1] !== "en" || header[2] !== "ko") {
    return { ok: false, reason: `bad header: ${lines[0]}` };
  }
  const posRe = /\((명|동|형|부|전|접|대|감|\?)\)/;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    const en = (cols[1] || "").trim();
    const ko = (cols[2] || "").trim();
    if (!en) return { ok: false, reason: `row ${i}: missing en` };
    if (!ko) return { ok: false, reason: `row ${i}: missing ko` };
    if (!ko.startsWith("(")) return { ok: false, reason: `row ${i}: ko not in (pos) form` };
    if (!posRe.test(ko)) return { ok: false, reason: `row ${i}: no pos tag` };
  }
  return { ok: true };
}

function safeDelete(baseDir, filePath) {
  const rel = path.relative(baseDir, filePath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Refusing to delete outside baseDir: ${filePath}`);
  }
  fs.rmSync(filePath, { force: true });
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(["Usage:", "  node scripts/validate-wordbooks-ko.mjs [--fixDelete]", ""].join("\n"));
    return;
  }

  const base = path.join(process.cwd(), "data", "wordbooks-ko");
  if (!fs.existsSync(base)) {
    process.stderr.write(`Missing: ${base}\n`);
    process.exit(2);
  }

  const files = walk(base).filter((p) => p.endsWith(".generated.tsv"));
  let ok = 0;
  let bad = 0;
  for (const f of files) {
    const res = validateFile(f);
    if (res.ok) ok++;
    else {
      bad++;
      process.stderr.write(`INVALID ${path.relative(process.cwd(), f)}: ${res.reason}\n`);
      if (args.fixDelete) safeDelete(base, f);
    }
  }
  process.stdout.write(`Done. ok=${ok} bad=${bad}\n`);
}

main();

