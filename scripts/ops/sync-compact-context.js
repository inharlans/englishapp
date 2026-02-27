#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const {
  collectState,
  createDefaultTemplate,
  readConfig,
  renderAutoBlock,
  upsertAutoBlock
} = require("./compact-context-lib");

function main() {
  const root = process.cwd();
  const config = readConfig(root);
  const docPath = path.join(root, config.docPath);

  const state = collectState(root, config);
  const autoBlock = renderAutoBlock(state);

  let current = "";
  if (fs.existsSync(docPath)) {
    current = fs.readFileSync(docPath, "utf8");
  } else {
    current = createDefaultTemplate();
  }

  const next = upsertAutoBlock(current, autoBlock);
  fs.mkdirSync(path.dirname(docPath), { recursive: true });
  fs.writeFileSync(docPath, next, "utf8");

  console.log(`compact-context-sync: PASS (${config.docPath})`);
}

main();
