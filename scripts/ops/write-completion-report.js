#!/usr/bin/env node
/* eslint-disable no-console */
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const cycleStatePath = path.join(root, ".loop", "last-cycle.json");
const reportDir = path.join(root, "docs", "ai-operating-system-2026-02-22", "reports");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readText(command) {
  return execSync(command, {
    cwd: root,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8"
  });
}

function getChangedFiles() {
  const tracked = readText("git diff --name-only HEAD")
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);
  const untracked = readText("git ls-files --others --exclude-standard")
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);
  return Array.from(new Set([...tracked, ...untracked]));
}

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const val = argv[i + 1];
    if (key === "--task") out.task = val;
    if (key === "--scope") out.scope = val;
  }
  return out;
}

function nowLocalDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return { date: `${yyyy}-${mm}-${dd}`, stamp: `${yyyy}${mm}${dd}-${hh}${mi}${ss}` };
}

function main() {
  const args = parseArgs(process.argv);
  const task = args.task || "unspecified-task";
  const scope = args.scope || "implementation update";

  if (!fs.existsSync(cycleStatePath)) {
    console.error(`Missing cycle state: ${cycleStatePath}`);
    process.exit(1);
  }

  const cycle = readJson(cycleStatePath);
  const changedFiles = cycle.changedFiles && cycle.changedFiles.length > 0 ? cycle.changedFiles : getChangedFiles();
  const verification = Array.isArray(cycle.steps) ? cycle.steps : [];
  const nextAction =
    cycle.status === "success"
      ? "- Review residual risks and queue next highest-priority task."
      : "- Fix failed verification step and rerun `npm run mcp:cycle`.";

  const { date, stamp } = nowLocalDate();
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `completion-${stamp}.md`);

  const lines = [];
  lines.push("# Completion Report");
  lines.push("");
  lines.push(`- Date: ${date}`);
  lines.push(`- Task: ${task}`);
  lines.push(`- Scope: ${scope}`);
  lines.push("");
  lines.push("## 1) Modified Files");
  if (changedFiles.length === 0) {
    lines.push("- (none)");
  } else {
    for (const file of changedFiles) lines.push(`- \`${file}\``);
  }
  lines.push("");
  lines.push("## 2) Verification");
  if (verification.length === 0) {
    lines.push("- (no cycle verification data)");
  } else {
    for (const step of verification) {
      const cmd = step.command || "n/a";
      const status = step.status || "unknown";
      lines.push(`- \`${cmd}\` -> ${status}`);
    }
  }
  lines.push("");
  lines.push("## 3) Next Action");
  lines.push(nextAction);
  lines.push("");

  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`Completion report written: ${path.relative(root, reportPath)}`);
}

main();
