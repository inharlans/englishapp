#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = process.cwd();
const loopDir = path.join(root, ".loop");
const statePath = path.join(loopDir, "nightly-state.json");

function nowIso() {
  return new Date().toISOString();
}

function run(command, args, options = {}) {
  const out = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.inherit ? "inherit" : ["ignore", "pipe", "pipe"],
    shell: options.shell || false,
    env: process.env
  });
  if ((out.status ?? 1) !== 0) {
    const details = (out.stderr || out.stdout || "").trim();
    throw new Error(`${command} ${args.join(" ")} failed${details ? `: ${details}` : ""}`);
  }
  return (out.stdout || "").trim();
}

function runShell(command, inherit = true) {
  const out = spawnSync(command, {
    cwd: root,
    stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
    shell: true,
    env: process.env,
    encoding: "utf8"
  });
  if ((out.status ?? 1) !== 0) {
    const details = (out.stderr || out.stdout || "").trim();
    throw new Error(`${command} failed${details ? `: ${details}` : ""}`);
  }
  return (out.stdout || "").trim();
}

function ensureLoopDir() {
  fs.mkdirSync(loopDir, { recursive: true });
}

function readState() {
  if (!fs.existsSync(statePath)) return null;
  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}

function writeState(state) {
  ensureLoopDir();
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function listChangedFiles() {
  const text = run("git", ["status", "--porcelain"]);
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const payload = line.slice(3);
      if (payload.includes(" -> ")) {
        const parts = payload.split(" -> ");
        return parts[parts.length - 1].trim();
      }
      return payload.trim();
    });
}

function countChangedLinesAgainstHead() {
  const text = run("git", ["diff", "--numstat", "HEAD"]);
  if (!text) return 0;
  let total = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [added, removed] = line.split(/\s+/);
    const addNum = Number(added);
    const removeNum = Number(removed);
    if (Number.isFinite(addNum)) total += addNum;
    if (Number.isFinite(removeNum)) total += removeNum;
  }
  return total;
}

function isNightlyBranch(name) {
  return /^ai\/nightly-\d{8}$/.test(name);
}

module.exports = {
  countChangedLinesAgainstHead,
  ensureLoopDir,
  isNightlyBranch,
  listChangedFiles,
  nowIso,
  readState,
  root,
  run,
  runShell,
  statePath,
  writeState
};
