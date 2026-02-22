#!/usr/bin/env node
/* eslint-disable no-console */
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const runtimeDir = path.join(root, ".loop");
const logPath = path.join(root, "mcp-cycle.log");
const statePath = path.join(runtimeDir, "last-cycle.json");

function now() {
  return new Date().toISOString();
}

function log(message) {
  const line = `[${now()}] ${message}`;
  console.log(line);
  fs.appendFileSync(logPath, `${line}\n`, "utf8");
}

function run(step, command) {
  log(`${step} -> ${command}`);
  execSync(command, { stdio: "inherit", cwd: root, env: process.env });
}

function readText(command) {
  return execSync(command, {
    cwd: root,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8"
  });
}

function toLines(text) {
  return text
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function getChangedFiles() {
  const tracked = toLines(readText("git diff --name-only HEAD"));
  const untracked = toLines(readText("git ls-files --others --exclude-standard"));
  return Array.from(new Set([...tracked, ...untracked]));
}

function isCodePath(filePath) {
  return (
    /^(app|components|lib|prisma|scripts|tests)\//.test(filePath) ||
    /^(middleware\.ts|next\.config\.ts|package\.json|tsconfig\.json)$/.test(filePath)
  );
}

function pickChangedAreaTest(changedFiles) {
  if (process.env.CHANGED_AREA_TEST_CMD) {
    return process.env.CHANGED_AREA_TEST_CMD;
  }
  if (changedFiles.length === 0) {
    return null;
  }
  return "npm run test";
}

function main() {
  fs.mkdirSync(runtimeDir, { recursive: true });
  log("Cycle worker started");

  const startedAt = now();
  let status = "success";
  let error = null;
  const stepResults = [];
  let changedFiles = [];
  let changedAreaTest = null;

  try {
    run("step:git-status", "git status --short");
    stepResults.push({ step: "git-status", command: "git status --short", status: "pass" });

    changedFiles = getChangedFiles().filter(isCodePath);
    log(
      `Detected ${changedFiles.length} changed code file(s)` +
        (changedFiles.length > 0 ? `: ${changedFiles.join(", ")}` : "")
    );

    run("step:typecheck", "npm run typecheck");
    stepResults.push({ step: "typecheck", command: "npm run typecheck", status: "pass" });

    run("step:lint", "npm run lint");
    stepResults.push({ step: "lint", command: "npm run lint", status: "pass" });

    changedAreaTest = pickChangedAreaTest(changedFiles);
    if (changedAreaTest) {
      run("step:changed-area-test", changedAreaTest);
      stepResults.push({
        step: "changed-area-test",
        command: changedAreaTest,
        status: "pass"
      });
    } else {
      stepResults.push({
        step: "changed-area-test",
        command: null,
        status: "skipped",
        reason: "no changed code files"
      });
    }
  } catch (e) {
    status = "failed";
    error = e instanceof Error ? e.message : String(e);
    log(`Cycle worker failed: ${error}`);
    if (stepResults.length === 0 || stepResults[stepResults.length - 1]?.status === "pass") {
      stepResults.push({ step: "unknown", command: null, status: "failed", error });
    }
  }

  const finishedAt = now();
  const payload = {
    startedAt,
    finishedAt,
    status,
    error,
    changedFiles,
    changedAreaTest,
    steps: stepResults
  };
  fs.writeFileSync(statePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  log(`Cycle worker finished: ${status}`);

  if (status !== "success") {
    process.exit(1);
  }
}

main();
