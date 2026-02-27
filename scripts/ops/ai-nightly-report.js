#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const { nowIso, readState, root, run } = require("./ai-nightly-common");

function getDateToken() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function main() {
  const state = readState();
  if (!state) {
    throw new Error("Missing nightly state. Run npm run ai:nightly:start first.");
  }

  const reportDir = path.join(root, "docs", "ai-operating-system-2026-02-22", "reports");
  fs.mkdirSync(reportDir, { recursive: true });

  const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  const commitList = run("git", ["log", "--oneline", `main..${branch}`]);
  const diffStat = run("git", ["diff", "--stat", `main...${branch}`]);
  const gateStatus = state.lastResult || "unknown";

  const lines = [];
  lines.push("# Nightly Review Report");
  lines.push("");
  lines.push(`- Generated at: ${nowIso()}`);
  lines.push(`- Branch: ${branch}`);
  lines.push(`- State status: ${state.status}`);
  lines.push(`- Cycle count: ${state.cycleCount}`);
  lines.push(`- Consecutive failures: ${state.consecutiveFailures}`);
  lines.push(`- Last result: ${gateStatus}`);
  lines.push(`- Last error: ${state.lastError || "none"}`);
  lines.push("");
  lines.push("## Commits Ahead of main");
  if (commitList) {
    for (const item of commitList.split(/\r?\n/).filter(Boolean)) {
      lines.push(`- ${item}`);
    }
  } else {
    lines.push("- (none)");
  }
  lines.push("");
  lines.push("## Diff Stat (main...branch)");
  if (diffStat) {
    lines.push("```text");
    lines.push(diffStat);
    lines.push("```");
  } else {
    lines.push("- (no file diff)");
  }
  lines.push("");
  lines.push("## Morning Decision Checklist");
  lines.push("- [ ] `git log --oneline main..HEAD` 확인");
  lines.push("- [ ] `git diff --stat main...HEAD` 확인");
  lines.push("- [ ] `npm run codex:workflow:check` 재검증");
  lines.push("- [ ] 로컬/개발 서버에서 핵심 시나리오 검증");
  lines.push("- [ ] 최종 결정: Merge / Partial / Hold / Drop");
  lines.push("");

  const reportPath = path.join(reportDir, `nightly-review-${getDateToken()}.md`);
  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`ai-nightly-report: PASS (${path.relative(root, reportPath)})`);
}

main();
