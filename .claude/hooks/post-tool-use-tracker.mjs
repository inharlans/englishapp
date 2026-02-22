import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function getInput() {
  const raw = readFileSync(0, "utf8");
  if (!raw || !raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const data = getInput();
if (!data) process.exit(0);

const toolName = String(data.tool_name || "");
const sessionId = String(data.session_id || "default");
const toolInput = data.tool_input || {};
const trackedTools = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit", "apply_patch", "shell_command", "Bash"]);
if (!trackedTools.has(toolName)) process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const cacheDir = join(projectDir, ".claude", "tsc-cache", sessionId);
mkdirSync(cacheDir, { recursive: true });

const now = Date.now();
const logPath = join(cacheDir, "tool-usage.log");

let filePath = "";
if (toolInput.file_path) filePath = String(toolInput.file_path);
if (!filePath && toolInput.path) filePath = String(toolInput.path);

const event = {
  ts: now,
  tool: toolName,
  file_path: filePath || null
};

appendFileSync(logPath, `${JSON.stringify(event)}\n`, "utf8");

const filesPath = join(cacheDir, "edited-files.log");
if (filePath) appendFileSync(filesPath, `${now}:${filePath}\n`, "utf8");

const reposPath = join(cacheDir, "affected-repos.txt");
const relative = filePath
  ? filePath.replace(projectDir.replace(/\\/g, "/"), "").replace(/^[/\\]/, "")
  : "";
const first = relative.split(/[\\/]/)[0] || "";
const known = new Set(["app", "components", "lib", "server", "scripts", "tests", "prisma", "docs", ".claude"]);
if (known.has(first)) {
  const existing = existsSync(reposPath) ? readFileSync(reposPath, "utf8").split(/\r?\n/).filter(Boolean) : [];
  if (!existing.includes(first)) {
    existing.push(first);
    writeFileSync(reposPath, `${existing.join("\n")}\n`, "utf8");
  }
}

process.exit(0);
