#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require("node:child_process");

const blockPattern = /^P(?:0|1)\b/m;

function run(command, args, input, shell = false) {
  return spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    input,
    shell
  });
}

function canRunCodex() {
  const probe = run("codex", ["--version"], null);
  return (probe.status ?? 1) === 0;
}

function getStagedDiff() {
  const diff = run("git", ["diff", "--cached", "--no-color"], null);
  if ((diff.status ?? 1) !== 0) {
    const msg = (diff.stderr || diff.stdout || "").trim();
    throw new Error(`failed to read staged diff${msg ? `: ${msg}` : ""}`);
  }
  return diff.stdout || "";
}

function runReviewOnDiff(diffText) {
  const prompt = [
    "You are a strict code reviewer.",
    "Review ONLY the git staged diff below.",
    "Report only actionable findings.",
    "Prefix each finding line with severity token: P0, P1, P2, or P3.",
    "Return concise plain text findings only.",
    "",
    "BEGIN STAGED DIFF",
    diffText,
    "END STAGED DIFF"
  ].join("\n");

  const res = run("codex", ["exec", "-"], prompt);

  const stdout = res.stdout || "";
  const stderr = res.stderr || "";
  if (stdout.trim()) process.stdout.write(stdout);
  if (stderr.trim()) process.stderr.write(stderr);

  return { code: res.status ?? 1, stdout, stderr };
}

function main() {
  const stagedDiff = getStagedDiff();
  if (!stagedDiff.trim()) {
    console.log("ai-review-gate: SKIP (no staged diff)");
    process.exit(0);
  }

  if (!canRunCodex()) {
    console.warn("ai-review-gate: SKIP (codex CLI unavailable)");
    process.exit(0);
  }

  const result = runReviewOnDiff(stagedDiff);
  if (result.code !== 0) {
    console.warn("ai-review-gate: SKIP (codex review execution error)");
    process.exit(0);
  }

  if (blockPattern.test(result.stdout) || blockPattern.test(result.stderr)) {
    console.error("ai-review-gate: FAIL (blocking review finding: P0/P1)");
    process.exit(1);
  }

  console.log("ai-review-gate: PASS");
  process.exit(0);
}

main();
