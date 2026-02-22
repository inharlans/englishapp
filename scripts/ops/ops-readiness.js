#!/usr/bin/env node
/* eslint-disable no-console */
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const runtimeDir = path.join(root, ".loop");
const statePath = path.join(runtimeDir, "last-ops-readiness.json");
const reportDir = path.join(root, "docs", "ai-operating-system-2026-02-22", "reports");

function nowIso() {
  return new Date().toISOString();
}

function nowStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function runStep(name, command) {
  const startedAt = nowIso();
  try {
    execSync(command, { cwd: root, env: process.env, stdio: "inherit" });
    return { name, command, startedAt, finishedAt: nowIso(), status: "pass" };
  } catch (error) {
    return {
      name,
      command,
      startedAt,
      finishedAt: nowIso(),
      status: "fail",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function writeReport(payload) {
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `ops-readiness-${nowStamp()}.md`);

  const lines = [];
  lines.push("# Ops Readiness Report");
  lines.push("");
  lines.push(`- startedAt: ${payload.startedAt}`);
  lines.push(`- finishedAt: ${payload.finishedAt}`);
  lines.push(`- status: ${payload.status}`);
  lines.push("");
  lines.push("## Steps");
  for (const step of payload.steps) {
    lines.push(`- ${step.name}: ${step.status} (\`${step.command}\`)`);
  }
  lines.push("");

  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
  return reportPath;
}

function main() {
  const startedAt = nowIso();
  fs.mkdirSync(runtimeDir, { recursive: true });

  const steps = [
    runStep("hooks-validate", "npm run hooks:validate"),
    runStep("mcp-cycle", "npm run mcp:cycle"),
    runStep("e2e-smoke", "npm run test:e2e:local:smoke")
  ];
  const status = steps.every((s) => s.status === "pass") ? "pass" : "fail";
  const payload = {
    startedAt,
    finishedAt: nowIso(),
    status,
    steps
  };

  fs.writeFileSync(statePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  const reportPath = writeReport(payload);

  console.log(`ops-readiness: ${status.toUpperCase()}`);
  console.log(`state: ${path.relative(root, statePath)}`);
  console.log(`report: ${path.relative(root, reportPath)}`);

  if (status !== "pass") process.exit(1);
}

main();
