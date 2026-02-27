#!/usr/bin/env node
/* eslint-disable no-console */
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const AUTO_START = "<!-- compact:auto:start -->";
const AUTO_END = "<!-- compact:auto:end -->";

function normalizePath(value) {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function runGit(root, args) {
  const out = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (out.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${out.stderr || out.stdout}`);
  }
  return (out.stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function listRepoFiles(root) {
  const tracked = runGit(root, ["ls-files"]);
  const untracked = runGit(root, ["ls-files", "--others", "--exclude-standard"]);
  return [...new Set([...tracked, ...untracked].map(normalizePath))].sort();
}

function pathExists(root, relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function isDirPattern(pattern) {
  return pattern.endsWith("/");
}

function matchesPattern(filePath, pattern) {
  if (isDirPattern(pattern)) return filePath.startsWith(pattern);
  return filePath === pattern;
}

function filesForPatterns(repoFiles, patterns) {
  return repoFiles.filter((filePath) => patterns.some((pattern) => matchesPattern(filePath, pattern)));
}

function hasAnyRegexMatch(text, regexList) {
  return regexList.some((re) => re.test(text));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hashFiles(root, files) {
  const hash = crypto.createHash("sha256");
  const sorted = [...files].sort();
  for (const relPath of sorted) {
    const absPath = path.join(root, relPath);
    if (!fs.existsSync(absPath)) continue;
    hash.update(relPath);
    hash.update("\0");
    hash.update(fs.readFileSync(absPath));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function shortHash(value) {
  return value.slice(0, 12);
}

function getHead(root) {
  try {
    const [sha] = runGit(root, ["rev-parse", "--short", "HEAD"]);
    const [subject] = runGit(root, ["log", "-1", "--pretty=%s"]);
    return { sha, subject };
  } catch (_error) {
    return { sha: "unknown", subject: "unknown" };
  }
}

function readConfig(root) {
  const configPath = path.join(root, "scripts", "ops", "compact-context-sources.json");
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw);
  return {
    ...parsed,
    docPath: normalizePath(parsed.docPath),
    groups: (parsed.groups || []).map((group) => ({
      ...group,
      paths: (group.paths || []).map(normalizePath)
    })),
    contentScopes: (parsed.contentScopes || []).map((scope) => ({
      ...scope,
      patterns: (scope.patterns || []).map(normalizePath)
    })),
    routeStatus: parsed.routeStatus || {}
  };
}

function collectRouteStatus(root, repoFiles, config) {
  const routeBasePath = normalizePath(config.routeStatus?.basePath || "app/api/");
  const routeFiles = repoFiles
    .filter((relPath) => relPath.startsWith(routeBasePath) && relPath.endsWith("/route.ts"))
    .sort();

  const importPrefixRegexes = (config.routeStatus?.migratedImportPrefixes || []).map(
    (prefix) => new RegExp(`from\\s+["']${escapeRegex(prefix)}`)
  );
  const identifierRegexes = (config.routeStatus?.migratedIdentifiers || []).map(
    (id) => new RegExp(`\\b${escapeRegex(id)}\\b`)
  );

  const migrated = [];
  const remaining = [];

  for (const relPath of routeFiles) {
    const source = fs.readFileSync(path.join(root, relPath), "utf8");
    const isMigratedByImport = hasAnyRegexMatch(source, importPrefixRegexes);
    const isMigratedByIdentifier = hasAnyRegexMatch(source, identifierRegexes);
    if (isMigratedByImport || isMigratedByIdentifier) {
      migrated.push(relPath);
    } else {
      remaining.push(relPath);
    }
  }

  return {
    basePath: routeBasePath,
    total: routeFiles.length,
    migrated: migrated.length,
    remaining: remaining.length,
    remainingFiles: remaining
  };
}

function collectState(root, config) {
  const repoFiles = listRepoFiles(root);
  const routeStatus = collectRouteStatus(root, repoFiles, config);
  const scopeStates = config.contentScopes.map((scope) => {
    const files = filesForPatterns(repoFiles, scope.patterns);
    const digest = hashFiles(root, files);
    return {
      name: scope.name,
      fileCount: files.length,
      digest
    };
  });

  const pathsState = [];
  for (const group of config.groups) {
    for (const relPath of group.paths) {
      pathsState.push({
        group: group.title,
        path: relPath,
        exists: pathExists(root, relPath)
      });
    }
  }

  const sourceHashInput = JSON.stringify({
    scopeStates,
    pathsState,
    routeStatus,
    head: getHead(root)
  });
  const sourceHash = crypto.createHash("sha256").update(sourceHashInput).digest("hex");

  return {
    sourceHash,
    head: getHead(root),
    routeStatus,
    scopeStates,
    groups: config.groups.map((group) => ({
      title: group.title,
      entries: group.paths.map((relPath) => ({
        path: relPath,
        exists: pathExists(root, relPath)
      }))
    }))
  };
}

function renderAutoBlock(state) {
  const lines = [];
  lines.push(AUTO_START);
  lines.push("## Auto Synced Snapshot");
  lines.push("");
  lines.push(`- Source hash: \`${shortHash(state.sourceHash)}\``);
  lines.push(`- HEAD: \`${state.head.sha}\` ${state.head.subject}`);
  lines.push("");
  lines.push("### Scope Digests");
  for (const scope of state.scopeStates) {
    lines.push(`- ${scope.name}: ${scope.fileCount} files, \`${shortHash(scope.digest)}\``);
  }
  lines.push("");
  lines.push("### Legacy Route Migration Status");
  lines.push(
    `- base: \`${state.routeStatus.basePath}\`, total: ${state.routeStatus.total}, migrated: ${state.routeStatus.migrated}, remaining: ${state.routeStatus.remaining}`
  );
  if (state.routeStatus.remainingFiles.length === 0) {
    lines.push("- remaining files: (none)");
  } else {
    lines.push("- remaining files:");
    for (const relPath of state.routeStatus.remainingFiles) {
      lines.push(`  - \`${relPath}\``);
    }
  }
  lines.push("");
  lines.push("### Relevant Paths");
  for (const group of state.groups) {
    lines.push(`- ${group.title}`);
    for (const entry of group.entries) {
      const status = entry.exists ? "ok" : "missing";
      lines.push(`  - [${status}] \`${entry.path}\``);
    }
  }
  lines.push(AUTO_END);
  return `${lines.join("\n")}\n`;
}

function createDefaultTemplate() {
  return `# Compact Context (Managed)\n\n## Goal\n\n- Continue stabilizing and standardizing the \`englishapp\` repo's Claude/Codex automation + API architecture in a hook-enabled CLI workflow.\n- Complete the API structure refactor toward thin route handlers that delegate business logic to shared \`lib/api\` helpers and \`server/domain/*\` services.\n- Keep quality gates continuously green (\`codex:workflow:check\`, lint, typecheck, tests), while updating tracking docs and pushing phased commits to \`origin/main\`.\n\n## Instructions\n\n- Work in the real repository: \`C:\\\\dev\\\\englishapp\` (not \`_tmp_advanced_harness_window\`).\n- Treat hooks as active and required in this environment; implement hook-first behavior (not old no-hook fallback patterns).\n- Follow actual repo topology (single app with \`app/server/lib\`) rather than monorepo assumptions.\n- Continue execution without unnecessary pause when user says \"그래\".\n- Keep refactor tracking docs updated as changes are made:\n  - \`docs/structure-refactor-2026-02-27-plan.md\`\n  - \`docs/structure-refactor-2026-02-27-checklist.md\`\n- After each meaningful batch, run \`npm run codex:workflow:check\` and keep all checks passing.\n- Commit and push each completed phase to \`origin/main\`; use temporary author/committer env vars because global git identity is unset.\n\n## Discoveries\n\n- Initial hook failures were caused by missing \`jq\`; resolved by installing \`jq\` via winget and ensuring PATH visibility.\n- Correct target repo confirmed as \`C:\\\\dev\\\\englishapp\`.\n- Hook/build tracking needed adaptation to single-app scoped changes (\`app/server/lib\`).\n- \`codex:workflow:check\` is strict and must pass for each phase.\n- \`scripts/ops/validate-text-encoding.js\` needed a guard to skip deleted/missing docs references to avoid false failures.\n- A metric helper integration caused payment route test failures; fixed by aligning with expected \`recordApiMetricFromStart\` via \`returnWithMetric\`.\n- Route-local \`parseId\` usage was standardized by replacing ad hoc helpers with shared parsing helpers.\n\n## Accomplished\n\n- Claude/Codex hook and automation alignment completed for this repo:\n  - Updated hook scripts and trigger resolution behavior for scoped file changes.\n  - Verified hook scenarios after changes.\n- Synced and cleaned \`.claude\` docs/config from reference material; removed stale/nonessential artifacts.\n- Auth policy hardening:\n  - Added regression test coverage for production password-login disable behavior.\n  - Updated operations/follow-up docs.\n- Multi-phase API refactor progressed substantially:\n  - Added/expanded shared helper layer (\`route-helpers\`, mutation wrappers, service-response adapters, metric wrappers, internal-cron wrapper, wordbook guards/query utilities).\n  - Moved orchestration/business logic into domain services (wordbook, clipper, internal cron, payments).\n  - Refactored many routes (Wordbook/Admin/Payments/Clipper/Internal Cron) to thin-route style.\n- Refactor tracking docs were maintained during the phases.\n- Phases were run through \`npm run codex:workflow:check\`, then committed and pushed.\n- Latest explicitly noted commit: \`b5f1d31\` (\"Unify internal cron routes with shared wrapper\").\n- Current status: no explicit in-progress diff was handed off; next work is to continue migrating remaining legacy routes to the same thin-route/shared-wrapper pattern and keep docs/checklist in sync.\n\n${AUTO_START}\n<!-- Auto section generated by scripts/ops/sync-compact-context.js -->\n${AUTO_END}\n`;
}

function upsertAutoBlock(docBody, autoBlock) {
  const pattern = new RegExp(`${AUTO_START}[\\s\\S]*?${AUTO_END}\\n?`, "m");
  if (pattern.test(docBody)) {
    return docBody.replace(pattern, autoBlock);
  }
  return `${docBody.trimEnd()}\n\n${autoBlock}`;
}

function extractAutoBlock(docBody) {
  const pattern = new RegExp(`${AUTO_START}[\\s\\S]*?${AUTO_END}\\n?`, "m");
  const match = docBody.match(pattern);
  return match ? match[0] : "";
}

module.exports = {
  AUTO_START,
  AUTO_END,
  collectState,
  createDefaultTemplate,
  extractAutoBlock,
  readConfig,
  renderAutoBlock,
  upsertAutoBlock
};
