import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

function getInput() {
  try {
    const raw = process.stdin.isTTY ? "" : readFileSync(0, "utf8");
    return raw && raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const _input = getInput();
const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

try {
  execSync("npm run typecheck", {
    cwd: projectDir,
    stdio: "ignore",
    timeout: 120000
  });
  process.exit(0);
} catch {
  console.error("STOP CHECK: typecheck failed.");
  console.error("Recommended next step: run auto-error-resolver and re-run typecheck.");
  // Keep fail-open to avoid blocking stop flow.
  process.exit(0);
}
