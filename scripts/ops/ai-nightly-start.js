#!/usr/bin/env node
/* eslint-disable no-console */
const {
  isNightlyBranch,
  nowIso,
  readState,
  run,
  runShell,
  writeState
} = require("./ai-nightly-common");

function getDateToken() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function main() {
  const branch = process.env.NIGHTLY_BRANCH || `ai/nightly-${getDateToken()}`;
  if (!isNightlyBranch(branch)) {
    throw new Error(`Invalid NIGHTLY_BRANCH: ${branch} (expected ai/nightly-YYYYMMDD)`);
  }

  run("git", ["rev-parse", "--verify", "main"]);
  const existingBranch = run("git", ["branch", "--list", branch]);
  if (existingBranch) {
    run("git", ["checkout", branch], { inherit: true });
  } else {
    run("git", ["checkout", "-b", branch, "main"], { inherit: true });
  }

  runShell("npm run compact:sync", true);

  const prior = readState();
  const state = {
    version: 1,
    branch,
    startedAt: nowIso(),
    updatedAt: nowIso(),
    status: "active",
    cycleCount: 0,
    consecutiveFailures: 0,
    maxCycles: Number(process.env.NIGHTLY_MAX_CYCLES || prior?.maxCycles || 6),
    maxConsecutiveFailures: Number(process.env.NIGHTLY_MAX_CONSECUTIVE_FAILURES || prior?.maxConsecutiveFailures || 2),
    maxChangedFiles: Number(process.env.NIGHTLY_MAX_CHANGED_FILES || prior?.maxChangedFiles || 20),
    maxChangedLines: Number(process.env.NIGHTLY_MAX_CHANGED_LINES || prior?.maxChangedLines || 1000),
    taskCommand: process.env.NIGHTLY_TASK_COMMAND || prior?.taskCommand || "",
    autoPush: String(process.env.NIGHTLY_AUTO_PUSH || prior?.autoPush || "0") === "1",
    intervalSeconds: Number(process.env.NIGHTLY_INTERVAL_SECONDS || prior?.intervalSeconds || 300),
    lastResult: null,
    lastError: null
  };

  writeState(state);
  console.log(`ai-nightly-start: PASS (branch=${branch})`);
}

main();
