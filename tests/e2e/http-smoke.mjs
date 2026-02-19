/* eslint-disable no-console */

const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const EMAIL = process.env.E2E_EMAIL || "admin@example.com";
const PASSWORD = process.env.E2E_PASSWORD || "change-me-now-123";
const BOOTSTRAP_TOKEN = process.env.AUTH_BOOTSTRAP_TOKEN || "";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function parseSetCookie(headers) {
  const raw = headers.get("set-cookie");
  if (!raw) return null;
  return raw.split(";")[0];
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { res, data };
}

async function main() {
  if (BOOTSTRAP_TOKEN) {
    const { res } = await fetchJson(`${BASE_URL}/api/auth/bootstrap`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-bootstrap-token": BOOTSTRAP_TOKEN
      },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });
    assert([200, 409, 403].includes(res.status), `bootstrap failed: ${res.status}`);
  }

  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  assert(loginRes.ok, `login failed: ${loginRes.status}`);
  const cookie = parseSetCookie(loginRes.headers);
  assert(cookie, "missing auth cookie after login");

  const authHeaders = { cookie, "content-type": "application/json" };

  const market = await fetchJson(`${BASE_URL}/api/wordbooks/market?sort=top&page=0&take=5`, {
    headers: authHeaders
  });
  assert(market.res.ok, `market failed: ${market.res.status}`);
  assert(Array.isArray(market.data.wordbooks), "market list invalid");

  if (market.data.wordbooks.length > 0) {
    const wbId = market.data.wordbooks[0].id;
    const detail = await fetchJson(`${BASE_URL}/api/wordbooks/${wbId}`, { headers: authHeaders });
    assert(detail.res.ok, `wordbook detail failed: ${detail.res.status}`);

    if (process.env.NEXT_PUBLIC_ENABLE_WORDBOOK_CARDS !== "0") {
      const cardsPage = await fetch(`${BASE_URL}/wordbooks/${wbId}/cards`, { headers: { cookie } });
      assert(cardsPage.status !== 404, `cards page route missing: ${cardsPage.status}`);
    }
  }

  const words = await fetchJson(`${BASE_URL}/api/words?mode=memorize&batch=1&page=0&week=1`, {
    headers: authHeaders
  });
  assert(words.res.ok, `words api failed: ${words.res.status}`);
  assert(words.data.isUserScoped === true, "isUserScoped flag is missing");

  const reports = await fetchJson(`${BASE_URL}/api/admin/reports`, { headers: authHeaders });
  assert(
    reports.res.ok || reports.res.status === 403,
    `admin reports failed: ${reports.res.status}`
  );

  console.log("[e2e] smoke passed");
}

main().catch((err) => {
  console.error("[e2e] smoke failed:", err.message);
  process.exitCode = 1;
});
