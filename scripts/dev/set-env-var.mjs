#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function usage() {
  console.error("Usage: node scripts/dev/set-env-var.mjs <KEY> <VALUE> [--file .env]");
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 2) usage();

const key = args[0];
const value = args[1];
let envFile = ".env";

for (let i = 2; i < args.length; i += 1) {
  if (args[i] === "--file") {
    if (!args[i + 1]) usage();
    envFile = args[i + 1];
    i += 1;
  }
}

if (!/^[A-Z0-9_]+$/.test(key)) {
  throw new Error(`Invalid env key: ${key}`);
}

const abs = path.resolve(process.cwd(), envFile);
const oldText = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
const hasCrlf = oldText.includes("\r\n");
const eol = hasCrlf ? "\r\n" : "\n";
const lines = oldText.length ? oldText.split(/\r?\n/) : [];
const renderedValue = JSON.stringify(value);
const nextLine = `${key}=${renderedValue}`;

let replaced = false;
const nextLines = lines.map((line) => {
  if (line.startsWith(`${key}=`)) {
    replaced = true;
    return nextLine;
  }
  return line;
});

if (!replaced) nextLines.push(nextLine);

const nextText = `${nextLines.filter((line, idx, arr) => !(idx === arr.length - 1 && line === "")).join(eol)}${eol}`;
fs.writeFileSync(abs, nextText, { encoding: "utf8" });

const masked = value.length > 8 ? `${value.slice(0, 4)}...${value.slice(-4)}` : "***";
console.log(`env:set PASS key=${key} file=${envFile} value=${masked}`);
