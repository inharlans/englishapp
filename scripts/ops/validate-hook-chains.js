#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = process.cwd();
const hooksDir = path.join(root, ".claude", "hooks");
const cacheRoot = path.join(root, ".claude", "tsc-cache");

function runNodeHook(scriptName, payload) {
  const scriptPath = path.join(hooksDir, scriptName);
  const out = spawnSync("node", [scriptPath], {
    cwd: root,
    input: JSON.stringify(payload),
    encoding: "utf8"
  });
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

function main() {
  const sessionId = "ahw-hook-validation";
  const cacheDir = path.join(cacheRoot, sessionId);

  if (fs.existsSync(cacheDir)) fs.rmSync(cacheDir, { recursive: true, force: true });

  const skillAuth = runNodeHook("skill-activation-prompt.mjs", {
    prompt: "\\uC778\\uC99D \\uB77C\\uC6B0\\uD2B8 \\uC624\\uB958 api \\uD14C\\uC2A4\\uD2B8"
  });
  if (skillAuth.status !== 0) {
    throw new Error(`skill hook failed with exit ${skillAuth.status}`);
  }
  assertContains(skillAuth.stdout, "auth-route-debugger", "skill activation auth debugger");
  assertContains(skillAuth.stdout, "auth-route-tester", "skill activation auth tester");

  const postTool = runNodeHook("post-tool-use-tracker.mjs", {
    session_id: sessionId,
    tool_name: "Edit",
    tool_input: { file_path: "app/page.tsx" }
  });
  if (postTool.status !== 0) {
    throw new Error(`post-tool-use hook failed with exit ${postTool.status}`);
  }

  const toolUsageLog = path.join(cacheDir, "tool-usage.log");
  const affectedRepos = path.join(cacheDir, "affected-repos.txt");
  if (!fs.existsSync(toolUsageLog)) {
    throw new Error("post-tool-use-tracker did not write tool-usage.log");
  }
  if (!fs.existsSync(affectedRepos)) {
    throw new Error("post-tool-use-tracker did not write affected-repos.txt");
  }
  assertContains(fs.readFileSync(affectedRepos, "utf8"), "app", "affected repo app");

  const stopTypecheck = runNodeHook("tsc-check.mjs", {});
  if (stopTypecheck.status !== 0) {
    throw new Error(`tsc-check hook failed with exit ${stopTypecheck.status}`);
  }

  const stopResolver = runNodeHook("trigger-build-resolver.mjs", {});
  if (stopResolver.status !== 0) {
    throw new Error(`trigger-build-resolver hook failed with exit ${stopResolver.status}`);
  }

  console.log("hook-chain-validation: PASS");
  console.log("mode=ahw-userprompt-posttool-stop");
  console.log(`cache=${path.relative(root, cacheDir)}`);
}

main();
