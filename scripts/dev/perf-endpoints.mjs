#!/usr/bin/env node

import { execSync, spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function resolveDbUrl() {
  const output = execSync("npx prisma dev ls", { encoding: "utf8" });
  const match = output.match(/prisma\+postgres:\/\/localhost:\d+\/\?api_key=([^\u0007\s]+)/);
  if (!match) throw new Error("Unable to parse prisma dev url.");
  const decoded = JSON.parse(decodeBase64Url(match[1]));
  const url = new URL(decoded.databaseUrl);
  url.searchParams.set("pgbouncer", "true");
  url.searchParams.set("sslmode", "disable");
  return url;
}

function toStats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const avg = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  return {
    n: samples.length,
    minMs: sorted[0],
    p50Ms: sorted[Math.floor((sorted.length - 1) * 0.5)],
    p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
    maxMs: sorted[sorted.length - 1],
    avgMs: Number(avg.toFixed(2))
  };
}

function parseArgs(argv) {
  const defaults = {
    runs: 30,
    warmup: 5,
    reportFile: ""
  };
  const next = { ...defaults };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--runs") {
      next.runs = Number(argv[i + 1] ?? defaults.runs);
      i += 1;
      continue;
    }
    if (arg === "--warmup") {
      next.warmup = Number(argv[i + 1] ?? defaults.warmup);
      i += 1;
      continue;
    }
    if (arg === "--report-file") {
      next.reportFile = String(argv[i + 1] ?? "").trim();
      i += 1;
    }
  }

  if (!Number.isFinite(next.runs) || next.runs < 1) {
    throw new Error(`Invalid --runs value: ${next.runs}`);
  }
  if (!Number.isFinite(next.warmup) || next.warmup < 0) {
    throw new Error(`Invalid --warmup value: ${next.warmup}`);
  }
  return {
    runs: Math.floor(next.runs),
    warmup: Math.floor(next.warmup),
    reportFile: next.reportFile
  };
}

function makeTimestamp() {
  return new Date().toISOString().replace(/[.:]/g, "-");
}

function defaultReportFile() {
  return path.join(process.cwd(), "reports", "perf", `perf-endpoints-${makeTimestamp()}.json`);
}

function writeReportFile(filePath, data) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return absolutePath;
}

function parseSetCookies(headers) {
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const raw = headers.get("set-cookie");
  if (!raw) return [];
  const parts = raw.match(/(?:[^,]|,\s*\w+=)+/g);
  return parts ?? [raw];
}

function extractAuth(headers) {
  const pairs = [];
  let csrfToken = "";
  for (const line of parseSetCookies(headers)) {
    const first = line.split(";")[0] ?? "";
    const idx = first.indexOf("=");
    if (idx <= 0) continue;
    const name = first.slice(0, idx);
    const value = first.slice(idx + 1);
    pairs.push(`${name}=${value}`);
    if (name === "csrf_token") csrfToken = value;
  }
  return { cookie: pairs.join("; "), csrfToken };
}

function makeRawText(size, prefix) {
  const lines = ["en\tko"];
  for (let i = 0; i < size; i += 1) {
    lines.push(`${prefix}_term_${i}\t${prefix}_뜻_${i}`);
  }
  return lines.join("\n");
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(240000) });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${url} ${JSON.stringify(body)}`);
  }
  return body;
}

async function waitReady(baseUrl) {
  for (let i = 0; i < 90; i += 1) {
    try {
      const res = await fetch(`${baseUrl}/api/wordbooks/market?page=0&take=1`, {
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) return;
    } catch {
      // retry
    }
    await sleep(1000);
  }
  throw new Error("Server did not become ready");
}

async function measure(label, fn, options) {
  for (let i = 0; i < options.warmup; i += 1) {
    await fn(i);
  }

  const samples = [];
  for (let i = 0; i < options.runs; i += 1) {
    const startedAt = process.hrtime.bigint();
    await fn(i);
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    samples.push(Number(elapsedMs.toFixed(2)));
  }
  return { label, samples, ...toStats(samples) };
}

async function runScenario({ name, dbUrl, port, measureOptions }) {
  const baseUrl = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env,
    DATABASE_URL: dbUrl,
    AUTH_SECRET: process.env.AUTH_SECRET || "dev-secret-change-me"
  };

  const server =
    process.platform === "win32"
      ? spawn("cmd.exe", ["/d", "/s", "/c", `npx -y node@20 node_modules/next/dist/bin/next start -p ${port}`], {
          env,
          stdio: ["ignore", "pipe", "pipe"]
        })
      : spawn("npx", ["-y", "node@20", "node_modules/next/dist/bin/next", "start", "-p", String(port)], {
          env,
          stdio: ["ignore", "pipe", "pipe"]
        });

  server.stdout.on("data", (chunk) => process.stdout.write(String(chunk)));
  server.stderr.on("data", (chunk) => process.stderr.write(String(chunk)));

  try {
    await waitReady(baseUrl);

    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: process.env.E2E_EMAIL || "debug@local.oingapp",
        password: process.env.E2E_PASSWORD || "debug1234!"
      }),
      signal: AbortSignal.timeout(30000)
    });
    if (!loginRes.ok) throw new Error(`login failed ${loginRes.status}`);
    const auth = extractAuth(loginRes.headers);

    const mine = await fetchJson(`${baseUrl}/api/wordbooks`, { headers: { cookie: auth.cookie } });
    const best = (mine.wordbooks ?? []).sort((a, b) => (b?._count?.items ?? 0) - (a?._count?.items ?? 0))[0];
    if (!best?.id) throw new Error("No wordbook for quiz benchmark");

    const market = await measure("market", async () => {
      await fetchJson(`${baseUrl}/api/wordbooks/market?sort=popular&page=0&take=30`);
    }, measureOptions);

    const quiz = await measure("quiz", async () => {
      await fetchJson(`${baseUrl}/api/wordbooks/${best.id}/quiz?mode=MEANING&partSize=200&partIndex=1`, {
        headers: { cookie: auth.cookie }
      });
    }, measureOptions);

    const importResult = await measure("import", async (i) => {
      await fetchJson(`${baseUrl}/api/words/import`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: auth.cookie,
          "x-csrf-token": auth.csrfToken,
          origin: baseUrl,
          referer: `${baseUrl}/wordbooks`,
          "x-forwarded-for": `10.88.0.${i + 1}`
        },
        body: JSON.stringify({ rawText: makeRawText(1000, `${name}_${Date.now()}_${i}`) })
      });
    }, measureOptions);

    return {
      name,
      dbUrl,
      wordbookId: best.id,
      results: [market, quiz, importResult]
    };
  } finally {
    server.kill("SIGTERM");
    await sleep(1000);
    if (!server.killed) server.kill("SIGKILL");
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const baseline = resolveDbUrl();
  const tuned = new URL(baseline.toString());
  tuned.searchParams.delete("single_use_connections");
  tuned.searchParams.set("connection_limit", "8");

  console.log("[perf] build with node20");
  execSync("npx -y node@20 scripts/build.mjs", { stdio: "inherit" });

  const baselineResult = await runScenario({
    name: "baseline",
    dbUrl: baseline.toString(),
    port: 3061,
    measureOptions: options
  });

  const tunedResult = await runScenario({
    name: "tuned",
    dbUrl: tuned.toString(),
    port: 3062,
    measureOptions: options
  });

  const report = {
    measuredAt: new Date().toISOString(),
    options,
    scenarios: [baselineResult, tunedResult]
  };

  const reportFilePath = writeReportFile(options.reportFile || defaultReportFile(), report);

  console.log("[perf] REPORT_JSON_START");
  console.log(JSON.stringify(report, null, 2));
  console.log("[perf] REPORT_JSON_END");
  console.log(`[perf] report_file=${reportFilePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
