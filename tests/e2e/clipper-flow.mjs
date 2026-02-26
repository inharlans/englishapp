const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const EMAIL = process.env.E2E_EMAIL || "e2e-clipped@example.com";
const E2E_SECRET = process.env.E2E_SECRET || "";
const CRON_SECRET = process.env.CRON_SECRET || "";

const FIXTURE_TITLE = `Clipper E2E ${Date.now()}`;
const FIXTURE_TERM = `clipper_term_${Date.now()}`;
const FIXTURE_EXAMPLE = "The model improves convergence when the prior is calibrated.";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
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

async function getE2eSession() {
  assert(E2E_SECRET, "E2E_SECRET is required for test:e2e:clipper");
  const res = await fetch(`${BASE_URL}/api/internal/e2e/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-e2e-secret": E2E_SECRET
    },
    body: JSON.stringify({ email: EMAIL })
  });
  assert(res.ok, `internal e2e login failed: ${res.status}`);
  const auth = buildAuthCookies(res.headers);
  assert(auth.cookieHeader, "missing auth cookie from internal e2e login");
  assert(auth.csrfToken, "missing csrf token from internal e2e login");
  return auth;
}

async function createWordbook(auth) {
  const { res, data } = await fetchJson(`${BASE_URL}/api/wordbooks`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: auth.cookieHeader,
      "x-csrf-token": auth.csrfToken,
      origin: BASE_URL,
      referer: `${BASE_URL}/wordbooks`
    },
    body: JSON.stringify({
      title: FIXTURE_TITLE,
      description: "Clipper e2e fixture wordbook",
      fromLang: "en",
      toLang: "ko"
    })
  });
  assert(res.ok, `wordbook create failed: ${res.status}`);
  assert(data.wordbook?.id, "wordbook id missing");
  return data.wordbook.id;
}

async function setDefaultWordbook(auth, wordbookId) {
  const { res, data } = await fetchJson(`${BASE_URL}/api/users/me/clipper-settings`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: auth.cookieHeader,
      "x-csrf-token": auth.csrfToken,
      origin: BASE_URL,
      referer: `${BASE_URL}/settings`
    },
    body: JSON.stringify({ defaultWordbookId: wordbookId })
  });
  assert(res.ok, `clipper settings patch failed: ${res.status}`);
  assert(data.defaultWordbookId === wordbookId, "defaultWordbookId mismatch");
}

async function addClipperItem(auth, wordbookId) {
  const { res, data } = await fetchJson(`${BASE_URL}/api/clipper/add`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: auth.cookieHeader,
      "x-csrf-token": auth.csrfToken,
      origin: BASE_URL,
      referer: `${BASE_URL}/clipper/add`
    },
    body: JSON.stringify({
      term: FIXTURE_TERM,
      exampleSentenceEn: FIXTURE_EXAMPLE,
      wordbookId
    })
  });
  assert(res.ok, `clipper add failed: ${res.status}`);
  assert(["created", "duplicate"].includes(data.status), `unexpected clipper status: ${data.status}`);
  if (data.status === "created") {
    assert(data.item?.enrichmentStatus === "QUEUED", "new clipper item must be QUEUED");
  }
  return data;
}

async function runCron() {
  if (!CRON_SECRET) {
    console.log("[e2e-clipper] skip cron trigger: CRON_SECRET is empty");
    return;
  }
  const { res, data } = await fetchJson(`${BASE_URL}/api/internal/cron/clipper-enrichment`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${CRON_SECRET}`
    }
  });
  assert(res.ok, `clipper cron failed: ${res.status}`);
  assert(data.ok === true, "clipper cron response must include ok=true");
}

async function main() {
  const auth = await getE2eSession();
  const wordbookId = await createWordbook(auth);
  await setDefaultWordbook(auth, wordbookId);
  const addResult = await addClipperItem(auth, wordbookId);
  await runCron();
  console.log(
    `[e2e-clipper] passed (status=${addResult.status}, wordbookId=${wordbookId})`
  );
}

main().catch((err) => {
  console.error("[e2e-clipper] failed:", err.message);
  process.exitCode = 1;
});
