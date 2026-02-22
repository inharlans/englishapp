#!/usr/bin/env node
/* eslint-disable no-console */

const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const EMAIL = process.env.E2E_EMAIL || "admin@example.com";
const PASSWORD = process.env.E2E_PASSWORD || "change-me-now-123";

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

function extractAuth(headers) {
  const setCookies = parseSetCookie(headers);
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

async function main() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });

  if (!res.ok) {
    let message = `login failed: ${res.status}`;
    try {
      const json = await res.json();
      if (json && typeof json.error === "string") message = json.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const auth = extractAuth(res.headers);
  if (!auth.cookie) throw new Error("missing auth cookies");

  const payload = {
    baseUrl: BASE_URL,
    email: EMAIL,
    cookie: auth.cookie,
    csrfToken: auth.csrfToken
  };
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});

