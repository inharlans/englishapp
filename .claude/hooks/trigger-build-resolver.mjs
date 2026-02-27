import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

function getInput() {
  try {
    const raw = process.stdin.isTTY ? "" : readFileSync(0, "utf8");
    return raw && raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function detectScope(filePath) {
  const normalized = String(filePath || "").replace(/\\/g, "/").trim();
  if (!normalized) return "";
  if (normalized === "middleware.ts" || normalized.startsWith("app/") || normalized.startsWith("components/")) {
    return "app";
  }
  if (normalized.startsWith("server/")) return "server";
  if (normalized.startsWith("lib/")) return "lib";
  return "";
}

function parseGitPaths(line) {
  const body = line.length > 3 ? line.slice(3).trim() : "";
  if (!body) return [];
  const renameParts = body.split(" -> ").map((part) => part.trim()).filter(Boolean);
  return renameParts.length > 1 ? renameParts : [body];
}

const input = getInput();
const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const sessionId = String(input.session_id || "default");
const cacheDir = join(projectDir, ".claude", "tsc-cache", sessionId);
mkdirSync(cacheDir, { recursive: true });

const scopes = new Set();
const affectedReposPath = join(cacheDir, "affected-repos.txt");
if (existsSync(affectedReposPath)) {
  const tracked = readFileSync(affectedReposPath, "utf8").split(/\r?\n/).filter(Boolean);
  for (const scope of tracked) {
    if (["app", "server", "lib"].includes(scope)) scopes.add(scope);
  }
}

try {
  const statusOutput = execSync("git status --porcelain -- app server lib components middleware.ts", {
    cwd: projectDir,
    stdio: ["ignore", "pipe", "pipe"]
  }).toString();

  const lines = statusOutput.split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    const paths = parseGitPaths(line);
    for (const path of paths) {
      const scope = detectScope(path);
      if (scope) scopes.add(scope);
    }
  }
} catch {
  process.exit(0);
}

if (scopes.size === 0) {
  process.stderr.write("No app/server/lib changes detected; skipping build resolver.\n");
  process.exit(0);
}

const sortedScopes = [...scopes].sort();
const errorPath = join(cacheDir, "last-build-errors.txt");
const scopePath = join(cacheDir, "build-failed-scopes.txt");

try {
  process.stderr.write(`Build check on scopes: ${sortedScopes.join(", ")}\n`);
  execSync("npm run build", {
    cwd: projectDir,
    stdio: "pipe",
    timeout: 600000
  });
  process.stderr.write("Build check passed.\n");
} catch (error) {
  const stdout = error && typeof error === "object" && "stdout" in error ? String(error.stdout || "") : "";
  const stderr = error && typeof error === "object" && "stderr" in error ? String(error.stderr || "") : "";
  const output = `${stdout}\n${stderr}`.trim();
  if (output) writeFileSync(errorPath, output, "utf8");
  writeFileSync(scopePath, `${sortedScopes.join("\n")}\n`, "utf8");
  process.stderr.write("Build check failed. Recommended next step: run auto-error-resolver with cached build logs.\n");
}

process.exit(0);
