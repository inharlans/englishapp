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

function listStagedFiles() {
  const out = spawnSync("git", ["diff", "--cached", "--name-only", "-z"], {
    cwd: root,
    encoding: "utf8"
  });
  if (out.status !== 0) {
    throw new Error(`git diff --cached --name-only -z failed: ${out.stderr || out.stdout}`);
  }
  return (out.stdout || "")
    .split("\0")
    .map((s) => s.trim())
    .filter(Boolean);
}

function listChangedFiles() {
  const out = spawnSync("git", ["status", "--porcelain", "-z"], {
    cwd: root,
    encoding: "utf8"
  });
  if (out.status !== 0) {
    throw new Error(`git status --porcelain -z failed: ${out.stderr || out.stdout}`);
  }

  const files = [];
  const parts = out.stdout.split("\0").filter(Boolean);
  for (let i = 0; i < parts.length; i += 1) {
    const entry = parts[i];
    if (entry.length < 4) continue;
    const status = entry.slice(0, 2);
    const file = entry.slice(3);

    if (status[0] === "R" || status[1] === "R") {
      const renamedTo = parts[i + 1];
      if (renamedTo) {
        files.push(renamedTo);
        i += 1;
      }
      continue;
    }

    if (file) files.push(file);
  }

  return files;
}

function quotePathForShell(relPath) {
  return `"${relPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
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
  if (!fs.existsSync(absPath)) {
    return null;
  }
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
  const validateAll = process.argv.includes("--all") || process.env.TEXT_ENCODING_VALIDATE_ALL === "1";
  const stagedOnly = process.argv.includes("--staged") || process.env.TEXT_ENCODING_VALIDATE_STAGED === "1";
  const changed = new Set(stagedOnly ? listStagedFiles() : listChangedFiles());
  const tracked = listTrackedFiles();

  const candidates = new Set();
  if (validateAll) {
    for (const file of tracked) candidates.add(file);
  } else {
    for (const file of tracked) {
      if (changed.has(file)) candidates.add(file);
    }
    for (const file of changed) {
      if (fs.existsSync(path.join(root, file))) {
        candidates.add(file);
      }
    }
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
    console.error("");
    console.error("How to fix:");
    console.error("1) Re-save the file as UTF-8 without BOM.");
    console.error("2) Ensure the file is plain text (no UTF-16/NUL bytes).");
    console.error("3) Re-run: npm run hooks:validate");
    console.error("");
    const failedPaths = failures
      .map((line) => line.split(": ").at(-1) || "")
      .filter(Boolean);
    if (failedPaths.length > 0) {
      console.error("Quick verify commands:");
      const joined = failedPaths.map(quotePathForShell).join(" ");
      console.error(`- PowerShell: Get-Content -Encoding Byte ${joined} | Out-Null`);
      console.error(`- Node: npm run encoding:validate`);
    }
    process.exit(1);
  }

  const modeLabel = validateAll ? "all" : stagedOnly ? "staged" : "changed";
  console.log(`text-encoding-validation: PASS (${files.length} files checked, mode=${modeLabel})`);
}

main();
