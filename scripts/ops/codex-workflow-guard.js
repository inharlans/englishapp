#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require("node:child_process");

const root = process.cwd();
const codeWatch = [
  "app/",
  "components/",
  "lib/",
  "server/",
  "scripts/",
  "tests/",
  "prisma/",
  "package.json",
  "package-lock.json",
  "middleware.ts",
  "next.config.ts"
];
const policyWatch = [".claude/", ".codex/", ".agents/", "scripts/", ".githooks/", "AGENTS.md"];
const docsWatch = ["docs/", "README.md"];

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

function collectChangedFiles() {
  const staged = run("git", ["diff", "--cached", "--name-only"]);
  const unstaged = run("git", ["diff", "--name-only"]);
  const untracked = run("git", ["ls-files", "--others", "--exclude-standard"]);
  return [...new Set([...staged, ...unstaged, ...untracked])];
}

function matches(file, patterns) {
  const normalized = file.replace(/\\/g, "/");
  return patterns.some((prefix) => normalized === prefix || normalized.startsWith(prefix));
}

function getPlan(changedFiles) {
  const hasCode = changedFiles.some((f) => matches(f, codeWatch));
  const hasPolicy = changedFiles.some((f) => matches(f, policyWatch));
  const hasDocs = changedFiles.some((f) => matches(f, docsWatch));
  const hasRelevant = hasCode || hasPolicy || hasDocs;

  if (!hasRelevant) return { hasRelevant: false, steps: [] };

  const steps = ["compact:check", "hooks:validate"];
  if (hasCode) steps.push("verify");
  steps.push("ai:review:gate");

  return { hasRelevant: true, steps, hasCode, hasPolicy, hasDocs };
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
  const changed = collectChangedFiles();
  const plan = getPlan(changed);

  if (!plan.hasRelevant) {
    console.log("codex-workflow-guard: SKIP (no relevant changes)");
    process.exit(0);
  }

  console.log(`codex-workflow-guard: changed=${changed.length} code=${Boolean(plan.hasCode)} policy=${Boolean(plan.hasPolicy)} docs=${Boolean(plan.hasDocs)}`);
  console.log(`codex-workflow-guard: steps=${plan.steps.join(",")}`);

  for (const step of plan.steps) {
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
