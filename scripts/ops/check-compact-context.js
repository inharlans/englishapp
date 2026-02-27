#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const { collectState, extractAutoBlock, readConfig, renderAutoBlock } = require("./compact-context-lib");

function main() {
  const root = process.cwd();
  const config = readConfig(root);
  const docPath = path.join(root, config.docPath);

  if (!fs.existsSync(docPath)) {
    console.error(`compact-context-check: FAIL (missing ${config.docPath})`);
    console.error("Run: npm run compact:sync");
    process.exit(1);
  }

  const content = fs.readFileSync(docPath, "utf8");
  const actualBlock = extractAutoBlock(content);
  if (!actualBlock) {
    console.error("compact-context-check: FAIL (auto markers missing)");
    console.error("Run: npm run compact:sync");
    process.exit(1);
  }

  const expectedBlock = renderAutoBlock(collectState(root, config));
  if (actualBlock !== expectedBlock) {
    console.error("compact-context-check: FAIL (snapshot out of date)");
    console.error("Run: npm run compact:sync");
    process.exit(1);
  }

  console.log("compact-context-check: PASS");
}

main();
