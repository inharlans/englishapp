#!/usr/bin/env node
/* eslint-disable no-console */

const DEFAULT_BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const DEFAULT_EMAIL = process.env.E2E_EMAIL || "admin@example.com";
const DEFAULT_PASSWORD = process.env.E2E_PASSWORD || "change-me-now-123";

function parseArgs(argv) {
  const out = {
    method: "GET",
    body: null,
    noAuth: false,
    baseUrl: DEFAULT_BASE_URL,
    pathOrUrl: ""
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--method") out.method = String(argv[++i] || "GET").toUpperCase();
    else if (arg === "--body") out.body = String(argv[++i] || "");
    else if (arg === "--no-auth") out.noAuth = true;
    else if (arg === "--base-url") out.baseUrl = String(argv[++i] || DEFAULT_BASE_URL);
    else if (!out.pathOrUrl) out.pathOrUrl = arg;
  }
  return out;
}

function parseSetCookie(headers) {
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const raw = headers.get("set-cookie");
  if (!raw) return [];
  const parts = raw.match(/(?:[^,]|,\s*\w+=)+/g);
  return parts ?? [raw];
}

function parseCookieNameValue(raw) {
  const first = raw.split(";")[0] ?? "";
  const eq = first.indexOf("=");
  if (eq <= 0) return null;
  return { name: first.slice(0, eq), value: first.slice(eq + 1) };
}

async function loginAndGetCookies(baseUrl) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD })
  });
  if (!res.ok) throw new Error(`login failed: ${res.status}`);
  const setCookies = parseSetCookie(res.headers);
  const pairs = [];
  let csrfToken = "";
  for (const raw of setCookies) {
    const parsed = parseCookieNameValue(raw);
    if (!parsed) continue;
    pairs.push(`${parsed.name}=${parsed.value}`);
    if (parsed.name === "csrf_token") csrfToken = parsed.value;
  }
  return { cookie: pairs.join("; "), csrfToken };
}

function resolveUrl(baseUrl, pathOrUrl) {
  if (!pathOrUrl) throw new Error("missing target URL or path");
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  if (!pathOrUrl.startsWith("/")) return `${baseUrl}/${pathOrUrl}`;
  return `${baseUrl}${pathOrUrl}`;
}

async function main() {
  const args = parseArgs(process.argv);
  const url = resolveUrl(args.baseUrl, args.pathOrUrl);

  const headers = {};
  if (!args.noAuth) {
    const auth = await loginAndGetCookies(args.baseUrl);
    headers.cookie = auth.cookie;
    if (["POST", "PUT", "PATCH", "DELETE"].includes(args.method) && auth.csrfToken) {
      headers["x-csrf-token"] = auth.csrfToken;
      headers.origin = args.baseUrl;
      headers.referer = `${args.baseUrl}/settings`;
    }
  }

  let body = undefined;
  if (args.body !== null) {
    headers["content-type"] = "application/json";
    body = args.body;
  }

  const res = await fetch(url, { method: args.method, headers, body });
  const text = await res.text();
  let parsed = text;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    // keep text
  }

  const out = {
    method: args.method,
    url,
    status: res.status,
    ok: res.ok,
    response: parsed
  };
  console.log(JSON.stringify(out, null, 2));
  if (!res.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});

