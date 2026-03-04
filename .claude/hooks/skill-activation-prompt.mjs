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

function hasAnyIntent(text, patterns = []) {
  return patterns.some((pattern) => {
    try {
      return new RegExp(String(pattern), "i").test(text);
    } catch {
      return false;
    }
  });
}

const input = getInput();
if (!input || !input.prompt) process.exit(0);

const decodedPrompt = String(input.prompt).replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
  String.fromCharCode(parseInt(code, 16))
);
const prompt = decodedPrompt.toLowerCase();
const recommend = new Set();
const disabled = new Set();
const __dirname = dirname(fileURLToPath(import.meta.url));
const rulesPath = join(__dirname, "..", "skills", "skill-rules.json");

if (existsSync(rulesPath)) {
  try {
    const rules = JSON.parse(readFileSync(rulesPath, "utf8"));
    for (const skillName of rules.disabledSkills || []) {
      disabled.add(skillName);
    }

    for (const [name, cfg] of Object.entries(rules.skills || {})) {
      if (disabled.has(name)) continue;

      const triggers = cfg.promptTriggers || {};
      if (hasAny(prompt, triggers.keywords) || hasAnyIntent(prompt, triggers.intentPatterns)) {
        recommend.add(name);
      }
    }
  } catch {
    // fall through to hardcoded defaults
  }
}

if (recommend.size === 0) {
  if (!disabled.has("error-tracking") && hasAny(prompt, ["sentry", "captureexception", "monitoring", "observability", "error tracking", "에러 추적", "트레이싱"])) {
    recommend.add("error-tracking");
  } else if (!disabled.has("fastapi-backend-guidelines") && hasAny(prompt, ["fastapi", "pydantic", "sqlmodel", "backend api", "repository", "service layer", "endpoint"])) {
    recommend.add("fastapi-backend-guidelines");
  } else if (!disabled.has("pytest-backend-testing") && hasAny(prompt, ["pytest", "fixture", "coverage", "integration test", "unit test", "테스트"])) {
    recommend.add("pytest-backend-testing");
  } else if (!disabled.has("nextjs-frontend-guidelines") && hasAny(prompt, ["next.js", "nextjs", "react", "frontend", "컴포넌트", "페이지"])) {
    recommend.add("nextjs-frontend-guidelines");
  } else if (!disabled.has("workflow-router")) {
    recommend.add("workflow-router");
  }
}

function resolveSkillPath(skillName) {
  const skillPath = join(__dirname, "..", "skills", skillName, "SKILL.md");
  if (existsSync(skillPath)) return `.claude/skills/${skillName}/SKILL.md`;

  const agentSkillPath = join(__dirname, "..", "..", ".agents", "skills", skillName, "SKILL.md");
  if (existsSync(agentSkillPath)) return `.agents/skills/${skillName}/SKILL.md`;

  return null;
}

console.log("SKILL ACTIVATION CHECK");
console.log("Recommended skills:");
for (const name of recommend) {
  const path = resolveSkillPath(name);
  if (path) {
    console.log(`- ${name} ("${path}")`);
  } else {
    console.log(`- ${name}`);
  }
}
console.log("");
console.log("Action: load relevant skill(s) before implementation.");
