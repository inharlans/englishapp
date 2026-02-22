import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function getInput() {
  const raw = readFileSync(0, "utf8");
  if (!raw || !raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function hasAny(text, tokens = []) {
  return tokens.some((t) => text.includes(String(t).toLowerCase()));
}

const input = getInput();
if (!input || !input.prompt) process.exit(0);

const decodedPrompt = String(input.prompt).replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
  String.fromCharCode(parseInt(code, 16))
);
const prompt = decodedPrompt.toLowerCase();
const recommend = new Set();
const __dirname = dirname(fileURLToPath(import.meta.url));
const rulesPath = join(__dirname, "..", "skills", "skill-rules.json");

if (existsSync(rulesPath)) {
  try {
    const rules = JSON.parse(readFileSync(rulesPath, "utf8"));
    for (const [name, cfg] of Object.entries(rules.skills || {})) {
      const triggers = cfg.promptTriggers || {};
      if (hasAny(prompt, triggers.keywords)) recommend.add(name);
    }
  } catch {
    // fall through to hardcoded defaults
  }
}

if (recommend.size === 0 && hasAny(prompt, ["plan", "planning", "roadmap", "design", "architecture", "계획"])) {
  recommend.add("planner");
}

if (recommend.size === 0 && hasAny(prompt, ["review", "검토", "리뷰", "architecture review", "code review"])) {
  recommend.add("plan-reviewer");
  recommend.add("code-architecture-reviewer");
}

if (recommend.size === 0 && hasAny(prompt, ["typescript", "tsc", "type error", "compile error", "build error"])) {
  recommend.add("auto-error-resolver");
}

if (recommend.size === 0 && hasAny(prompt, ["refactor", "restructure", "cleanup", "리팩터", "리팩토링"])) {
  recommend.add("refactor-planner");
}

if (recommend.size === 0 && hasAny(prompt, ["auth route", "authentication route", "401", "403", "jwt", "인증 라우트"])) {
  recommend.add("auth-route-debugger");
  recommend.add("auth-route-tester");
}

if (recommend.size === 0 && hasAny(prompt, ["frontend error", "react error", "runtime error", "console error", "프론트 에러"])) {
  recommend.add("frontend-error-fixer");
}

if (recommend.size === 0 && hasAny(prompt, ["research", "look up", "investigate", "github issue", "리서치", "조사", "검색"])) {
  recommend.add("web-research-specialist");
}

if (recommend.size === 0 && hasAny(prompt, ["document", "documentation", "readme", "문서", "문서화", "핸드오프"])) {
  recommend.add("documentation-architect");
}

if (recommend.size === 0) recommend.add("planner");

console.log("SKILL ACTIVATION CHECK");
console.log("Recommended agents:");
for (const name of recommend) {
  console.log(`- ${name} (".claude/agents/${name}.md")`);
}
console.log("");
console.log("Action: pick relevant agent(s) before implementation.");
