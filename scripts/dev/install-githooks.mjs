#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const hooksPath = path.join(".githooks");

const res = spawnSync("git", ["config", "core.hooksPath", hooksPath], {
  cwd: root,
  stdio: "inherit"
});

if ((res.status ?? 1) !== 0) {
  process.exit(res.status ?? 1);
}

console.log(`git-hooks-installed: ${hooksPath}`);
