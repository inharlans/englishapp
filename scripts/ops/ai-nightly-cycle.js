#!/usr/bin/env node
/* eslint-disable no-console */
const {
  countChangedLinesAgainstHead,
  isNightlyBranch,
  listChangedFiles,
  nowIso,
  readState,
  run,
  runShell,
  writeState
} = require("./ai-nightly-common");

function commitWithTempIdentity(message) {
  run(
    "git",
    [
      "-c",
      "user.name=Codex Agent",
      "-c",
      "user.email=codex@local",
      "commit",
      "--author=Codex Agent <codex@local>",
      "-m",
      message
    ],
    { inherit: true }
  );
}

function recordFailure(state, message) {
  state.consecutiveFailures += 1;
  state.updatedAt = nowIso();
  state.lastResult = "failed";
  state.lastError = message;
  if (state.consecutiveFailures >= state.maxConsecutiveFailures) {
    state.status = "halted";
  }
  writeState(state);
}

function main() {
  const state = readState();
  if (!state) {
    throw new Error("Missing .loop/nightly-state.json. Run npm run ai:nightly:start first.");
  }
  if (state.status !== "active") {
    throw new Error(`Nightly state is not active: ${state.status}`);
  }

  const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch !== state.branch || !isNightlyBranch(branch)) {
    throw new Error(`Current branch mismatch. expected=${state.branch} actual=${branch}`);
  }

  if (state.cycleCount >= state.maxCycles) {
    state.status = "completed";
    state.updatedAt = nowIso();
    writeState(state);
    console.log("ai-nightly-cycle: SKIP (max cycles reached)");
    return;
  }

  state.cycleCount += 1;
  state.updatedAt = nowIso();
  writeState(state);

  try {
    runShell("npm run compact:sync", true);

    if (state.taskCommand) {
      runShell(state.taskCommand, true);
    }

    const changedFiles = listChangedFiles();
    const changedLines = countChangedLinesAgainstHead();
    if (changedFiles.length > state.maxChangedFiles) {
      throw new Error(
        `Changed files limit exceeded: ${changedFiles.length} > ${state.maxChangedFiles}`
      );
    }
    if (changedLines > state.maxChangedLines) {
      throw new Error(
        `Changed lines limit exceeded: ${changedLines} > ${state.maxChangedLines}`
      );
    }

    runShell("npm run codex:workflow:check", true);

    if (changedFiles.length === 0) {
      state.consecutiveFailures = 0;
      state.updatedAt = nowIso();
      state.lastResult = "pass-noop";
      state.lastError = null;
      writeState(state);
      console.log("ai-nightly-cycle: PASS (no changes)");
      return;
    }

    run("git", ["add", "-A"], { inherit: true });
    commitWithTempIdentity(`nightly: cycle ${state.cycleCount} pass checks`);

    if (state.autoPush) {
      run("git", ["push", "-u", "origin", state.branch], { inherit: true });
    }

    state.consecutiveFailures = 0;
    state.updatedAt = nowIso();
    state.lastResult = "pass-commit";
    state.lastError = null;
    writeState(state);
    console.log("ai-nightly-cycle: PASS");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    recordFailure(state, message);
    console.error(`ai-nightly-cycle: FAIL: ${message}`);
    process.exit(1);
  }
}

main();
