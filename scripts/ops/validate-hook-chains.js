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

function assertNotContains(text, expected, label) {
  if (text.includes(expected)) {
    throw new Error(`${label}: should not include "${expected}"`);
  }
}

function main() {
  const sessionId = "ahw-hook-validation";
  const cacheDir = path.join(cacheRoot, sessionId);

  if (fs.existsSync(cacheDir)) fs.rmSync(cacheDir, { recursive: true, force: true });

  const skillAuth = runNodeHook("skill-activation-prompt.mjs", {
    prompt: "skill-rules hook trigger routing"
  });
  if (skillAuth.status !== 0) {
    throw new Error(`skill hook failed with exit ${skillAuth.status}`);
  }
  assertContains(skillAuth.stdout, "skill-developer", "skill activation skill developer");

  const skillFrontend = runNodeHook("skill-activation-prompt.mjs", {
    prompt: "next.js app router 컴포넌트 페이지"
  });
  if (skillFrontend.status !== 0) {
    throw new Error(`skill frontend hook failed with exit ${skillFrontend.status}`);
  }
  assertContains(skillFrontend.stdout, "nextjs-frontend-guidelines", "skill activation frontend");
  assertNotContains(skillFrontend.stdout, "fastapi-backend-guidelines", "skill activation frontend");

  const skillErrorTracking = runNodeHook("skill-activation-prompt.mjs", {
    prompt: "sentry captureException monitoring"
  });
  if (skillErrorTracking.status !== 0) {
    throw new Error(`skill error-tracking hook failed with exit ${skillErrorTracking.status}`);
  }
  assertContains(skillErrorTracking.stdout, "error-tracking", "skill activation error tracking");
  assertNotContains(skillErrorTracking.stdout, "fastapi-backend-guidelines", "skill activation error tracking");

  const skillBackend = runNodeHook("skill-activation-prompt.mjs", {
    prompt: "fastapi router endpoint service repository"
  });
  if (skillBackend.status !== 0) {
    throw new Error(`skill backend hook failed with exit ${skillBackend.status}`);
  }
  assertContains(skillBackend.stdout, "fastapi-backend-guidelines", "skill activation backend");

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
