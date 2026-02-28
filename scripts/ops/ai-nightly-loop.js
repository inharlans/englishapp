#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { nowIso, readState, root, writeState } = require("./ai-nightly-common");

function sleep(seconds) {
  if (seconds <= 0) return;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, seconds * 1000);
}

function runCycle() {
  const scriptPath = path.join(root, "scripts", "ops", "ai-nightly-cycle.js");
  const out = spawnSync("node", [scriptPath], {
    cwd: root,
    stdio: "inherit",
    env: process.env
  });
  return out.status ?? 1;
}

function main() {
  const startedAt = nowIso();
  console.log(`ai-nightly-loop: started at ${startedAt}`);

  while (true) {
    const before = readState();
    if (!before) throw new Error("Missing nightly state. Run npm run ai:nightly:start first.");
    if (before.status !== "active") {
      console.log(`ai-nightly-loop: stop (status=${before.status})`);
      break;
    }
    if (before.cycleCount >= before.maxCycles) {
      before.status = "completed";
      before.updatedAt = nowIso();
      before.lastResult = "completed-max-cycles";
      before.lastError = null;
      writeState(before);
      console.log("ai-nightly-loop: stop (max cycles reached)");
      break;
    }

    const runtimeLimitMinutes = Number(before.maxRuntimeMinutes || 0);
    if (runtimeLimitMinutes > 0 && before.startedAt) {
      const startedMs = Date.parse(before.startedAt);
      if (Number.isFinite(startedMs)) {
        const elapsedMinutes = (Date.now() - startedMs) / 60000;
        if (elapsedMinutes >= runtimeLimitMinutes) {
          before.status = "completed";
          before.updatedAt = nowIso();
          before.lastResult = "completed-max-runtime";
          before.lastError = null;
          writeState(before);
          console.log(`ai-nightly-loop: stop (max runtime reached: ${runtimeLimitMinutes}m)`);
          break;
        }
      }
    }

    const code = runCycle();
    const after = readState();
    if (code !== 0) {
      const failures = after?.consecutiveFailures || 0;
      const max = after?.maxConsecutiveFailures || 1;
      console.log(`ai-nightly-loop: cycle failed (${failures}/${max})`);
      if (failures >= max) {
        console.log("ai-nightly-loop: stop (max consecutive failures reached)");
        break;
      }
    }

    const interval = after?.intervalSeconds || 0;
    if (interval > 0) {
      console.log(`ai-nightly-loop: sleeping ${interval}s before next cycle`);
      sleep(interval);
    }
  }

  console.log(`ai-nightly-loop: finished at ${nowIso()}`);
}

main();
