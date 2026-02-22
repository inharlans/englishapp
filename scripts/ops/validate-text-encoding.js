#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = process.cwd();
const textExtensions = new Set([
  ".md",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".yml",
  ".yaml",
  ".ps1",
  ".sh",
  ".css",
  ".html",
  ".env"
]);

const alwaysCheck = new Set([".env", ".env.example"]);

function listTrackedFiles() {
  const out = spawnSync("git", ["ls-files"], { cwd: root, encoding: "utf8" });
  if (out.status !== 0) {
    throw new Error(`git ls-files failed: ${out.stderr || out.stdout}`);
  }
  return out.stdout
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function listChangedFiles() {
  const out = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
  if (out.status !== 0) {
    throw new Error(`git status --porcelain failed: ${out.stderr || out.stdout}`);
  }
  const files = [];
  for (const rawLine of out.stdout.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line) continue;
    const payload = line.slice(3);
    const renamed = payload.includes(" -> ");
    const target = renamed ? payload.split(" -> ").at(-1) : payload;
    if (target) files.push(target.trim());
  }
  return files;
}

function isTextTarget(relPath) {
  const base = path.basename(relPath);
  if (alwaysCheck.has(base)) return true;
  const ext = path.extname(relPath).toLowerCase();
  return textExtensions.has(ext);
}

function hasUtf16Bom(buf) {
  if (buf.length < 2) return false;
  return (buf[0] === 0xff && buf[1] === 0xfe) || (buf[0] === 0xfe && buf[1] === 0xff);
}

function hasUtf8Bom(buf) {
  if (buf.length < 3) return false;
  return buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
}

function validateFile(relPath) {
  const absPath = path.join(root, relPath);
  const buf = fs.readFileSync(absPath);

  if (hasUtf16Bom(buf)) {
    return `UTF-16 BOM detected (must be UTF-8): ${relPath}`;
  }

  // UTF-8 text files should not contain NUL bytes in this repo.
  if (buf.includes(0x00)) {
    return `NUL byte detected (likely wrong encoding/binary): ${relPath}`;
  }

  const content = buf.toString("utf8");
  if (content.includes("\uFFFD")) {
    return `Unicode replacement char detected (possible mojibake): ${relPath}`;
  }

  // Normalize policy: prefer UTF-8 without BOM.
  if (hasUtf8Bom(buf)) {
    return `UTF-8 BOM detected (use UTF-8 without BOM): ${relPath}`;
  }

  return null;
}

function main() {
  const changed = new Set(listChangedFiles());
  const tracked = listTrackedFiles();
  for (const file of tracked) {
    if (changed.has(file)) continue;
  }

  const candidates = new Set();
  for (const file of tracked) {
    if (changed.has(file)) candidates.add(file);
  }
  if (fs.existsSync(path.join(root, ".env"))) candidates.add(".env");

  const files = [...candidates].filter(isTextTarget);

  const failures = [];
  for (const file of files) {
    const err = validateFile(file);
    if (err) failures.push(err);
  }

  if (failures.length > 0) {
    console.error("text-encoding-validation: FAIL");
    for (const fail of failures) console.error(`- ${fail}`);
    process.exit(1);
  }

  console.log(`text-encoding-validation: PASS (${files.length} files checked)`);
}

main();
