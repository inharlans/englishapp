#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = process.cwd();
const hooksDir = path.join(root, ".claude", "hooks");
const stateDir = path.join(hooksDir, "state");

function getShellCommand() {
  const candidates = [
    "C:/Program Files/PowerShell/7/pwsh.exe",
    "pwsh",
    "powershell"
  ];
  for (const cmd of candidates) {
    const probe = spawnSync(cmd, ["-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"], {
      encoding: "utf8"
    });
    if (probe.status === 0) return cmd;
  }
  throw new Error("PowerShell executable was not found.");
}

function runHook(shellCmd, scriptName, payload) {
  const scriptPath = path.join(hooksDir, scriptName);
  const out = spawnSync(
    shellCmd,
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath],
    {
      cwd: root,
      input: JSON.stringify(payload),
      encoding: "utf8"
    }
  );
  return {
    status: out.status ?? 0,
    stdout: out.stdout || "",
    stderr: out.stderr || ""
  };
}

function assertContains(text, expected, label) {
  if (!text.includes(expected)) {
    throw new Error(`${label}: missing "${expected}"`);
  }
}

function cleanupState(sessionId) {
  fs.mkdirSync(stateDir, { recursive: true });
  const statePath = path.join(stateDir, `plan-gate-${sessionId}.json`);
  if (fs.existsSync(statePath)) fs.unlinkSync(statePath);
  return statePath;
}

function main() {
  const shellCmd = getShellCommand();
  const sessionId = "pilot-003-auth-chain";
  const statePath = cleanupState(sessionId);

  const routerAuth = runHook(shellCmd, "subagent-router.ps1", {
    session_id: sessionId,
    prompt: "401 unauthorized auth route api test"
  });
  assertContains(routerAuth.stdout, "auth-route-debugger", "router auth debugger");
  assertContains(routerAuth.stdout, "auth-route-tester", "router auth tester");
  assertContains(
    routerAuth.stdout,
    "run auth-route-debugger then auth-route-tester",
    "router execution policy"
  );

  const routerAuthKo = runHook(shellCmd, "subagent-router.ps1", {
    session_id: `${sessionId}-ko`,
    prompt: "\uC778\uC99D \uB77C\uC6B0\uD2B8 \uC624\uB958 api \uD14C\uC2A4\uD2B8"
  });
  assertContains(routerAuthKo.stdout, "auth-route-debugger", "router auth debugger ko");
  assertContains(routerAuthKo.stdout, "auth-route-tester", "router auth tester ko");

  const gateMajor = runHook(shellCmd, "plan-gate-prompt.ps1", {
    session_id: sessionId,
    prompt: "major feature implementation start"
  });
  assertContains(gateMajor.stdout, "PLAN GATE NOTICE", "plan-gate major");

  const pretoolBlocked = runHook(shellCmd, "plan-gate-pretool.ps1", {
    session_id: sessionId,
    tool_name: "Edit",
    tool_input: { file_path: "app/api/auth/login/route.ts" }
  });
  if (pretoolBlocked.status !== 2) {
    throw new Error(`pretool block expected exit 2, got ${pretoolBlocked.status}`);
  }

  const gateApproved = runHook(shellCmd, "plan-gate-prompt.ps1", {
    session_id: sessionId,
    prompt: "plan approved"
  });
  if (gateApproved.status !== 0) {
    throw new Error(`plan approval failed with exit ${gateApproved.status}`);
  }

  const pretoolUnblocked = runHook(shellCmd, "plan-gate-pretool.ps1", {
    session_id: sessionId,
    tool_name: "Edit",
    tool_input: { file_path: "app/api/auth/login/route.ts" }
  });
  if (pretoolUnblocked.status !== 0) {
    throw new Error(`pretool unblock expected exit 0, got ${pretoolUnblocked.status}`);
  }

  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  if (state.requirePlan !== false) {
    throw new Error("state check failed: requirePlan must be false after approval");
  }

  console.log("hook-chain-validation: PASS");
  console.log(`shell=${shellCmd}`);
  console.log(`state=${path.relative(root, statePath)}`);
}

main();
