#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const root = process.cwd();
const watched = [
  "app/",
  "components/",
  "lib/",
  "server/",
  "scripts/",
  "tests/",
  "prisma/",
  ".claude/",
  ".codex/",
  "package.json",
  "package-lock.json"
];

function run(command, args) {
  const res = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  if (res.status !== 0) {
    const msg = (res.stderr || res.stdout || "").trim();
    throw new Error(`${command} ${args.join(" ")} failed${msg ? `: ${msg}` : ""}`);
  }
  return (res.stdout || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function hasRelevantChanges() {
  const staged = run("git", ["diff", "--cached", "--name-only"]);
  const unstaged = run("git", ["diff", "--name-only"]);
  const changed = new Set([...staged, ...unstaged]);
  if (changed.size === 0) return false;

  for (const file of changed) {
    const normalized = file.replace(/\\/g, "/");
    if (watched.some((prefix) => normalized === prefix || normalized.startsWith(prefix))) {
      return true;
    }
  }
  return false;
}

function runNpm(script) {
  const res = spawnSync(`npm run ${script}`, {
    cwd: root,
    stdio: "inherit",
    shell: true
  });
  return res.status ?? 1;
}

function main() {
  const relevant = hasRelevantChanges();
  if (!relevant) {
    console.log("codex-workflow-guard: SKIP (no relevant changes)");
    process.exit(0);
  }

  const steps = ["hooks:validate", "verify"];
  for (const step of steps) {
    const code = runNpm(step);
    if (code !== 0) {
      console.error(`codex-workflow-guard: FAIL at ${step}`);
      process.exit(code);
    }
  }

  console.log("codex-workflow-guard: PASS");
  process.exit(0);
}

main();
