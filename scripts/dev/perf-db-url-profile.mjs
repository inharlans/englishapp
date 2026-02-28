#!/usr/bin/env node

import { execSync } from "node:child_process";

import { PrismaClient } from "@prisma/client";

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function resolveLocalDbUrl() {
  const output = execSync("npx prisma dev ls", { encoding: "utf8" });
  const match = output.match(/prisma\+postgres:\/\/localhost:\d+\/\?api_key=([^\u0007\s]+)/);
  if (!match) {
    throw new Error("Unable to parse prisma dev url.");
  }
  const decoded = JSON.parse(decodeBase64Url(match[1]));
  const url = new URL(decoded.databaseUrl);
  url.searchParams.set("pgbouncer", "true");
  url.searchParams.set("sslmode", "disable");
  return url;
}

async function measureSeries(label, url) {
  const prisma = new PrismaClient({
    datasourceUrl: url.toString()
  });
  const series = [];
  try {
    for (let i = 0; i < 6; i += 1) {
      const startedAt = Date.now();
      await prisma.$queryRawUnsafe("SELECT 1");
      series.push(Date.now() - startedAt);
    }
  } finally {
    await prisma.$disconnect();
  }
  console.log(`${label}: ${JSON.stringify(series)}`);
}

async function main() {
  const baseline = resolveLocalDbUrl();
  const tuned = new URL(baseline.toString());
  tuned.searchParams.delete("single_use_connections");
  tuned.searchParams.set("connection_limit", "8");

  console.log("baseline_url", baseline.toString());
  console.log("tuned_url", tuned.toString());
  await measureSeries("baseline", baseline);
  await measureSeries("tuned", tuned);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
