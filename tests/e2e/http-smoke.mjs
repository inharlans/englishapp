const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const EMAIL = process.env.E2E_EMAIL || "admin@example.com";
const PASSWORD = process.env.E2E_PASSWORD || "change-me-now-123";
const BOOTSTRAP_TOKEN = process.env.AUTH_BOOTSTRAP_TOKEN || "";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function parseSetCookie(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }
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

function buildAuthCookies(headers) {
  const setCookies = parseSetCookie(headers);
  const pairs = [];
  let csrfToken = "";
  for (const raw of setCookies) {
    const parsed = parseCookieNameValue(raw);
    if (!parsed) continue;
    pairs.push(`${parsed.name}=${parsed.value}`);
    if (parsed.name === "csrf_token") csrfToken = parsed.value;
  }
  return { cookieHeader: pairs.join("; "), csrfToken };
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
  const meBeforeLogin = await fetchJson(`${BASE_URL}/api/auth/me`);
  assert(meBeforeLogin.res.ok, `auth/me before login failed: ${meBeforeLogin.res.status}`);
  assert(meBeforeLogin.data.user === null, "auth/me before login should return user null");

  const reportsNoAuth = await fetchJson(`${BASE_URL}/api/admin/reports`);
  assert(reportsNoAuth.res.status === 401, `admin reports without auth must be 401: ${reportsNoAuth.res.status}`);

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
  const authCookies = buildAuthCookies(loginRes.headers);
  assert(authCookies.cookieHeader, "missing auth cookie after login");
  assert(authCookies.csrfToken, "missing csrf cookie after login");

  const authHeaders = { cookie: authCookies.cookieHeader, "content-type": "application/json" };

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
      const cardsPage = await fetch(`${BASE_URL}/wordbooks/${wbId}/cards`, {
        headers: { cookie: authCookies.cookieHeader }
      });
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

  const logoutNoCsrf = await fetchJson(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: authCookies.cookieHeader
    },
    body: "{}"
  });
  assert(logoutNoCsrf.res.status === 403, `logout without csrf must be 403: ${logoutNoCsrf.res.status}`);

  const logoutWithCsrf = await fetchJson(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: authCookies.cookieHeader,
      "x-csrf-token": authCookies.csrfToken,
      origin: BASE_URL,
      referer: `${BASE_URL}/settings`
    },
    body: "{}"
  });
  assert(logoutWithCsrf.res.ok, `logout with csrf failed: ${logoutWithCsrf.res.status}`);

  console.log("[e2e] smoke passed");
}

main().catch((err) => {
  console.error("[e2e] smoke failed:", err.message);
  process.exitCode = 1;
});
