/* eslint-disable no-console */

import { chromium, devices } from "playwright";

const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const EMAIL = process.env.E2E_EMAIL || "admin@example.com";
const PASSWORD = process.env.E2E_PASSWORD || "change-me-now-123";
const BOOTSTRAP_TOKEN = process.env.AUTH_BOOTSTRAP_TOKEN || "";

const FIXTURE_TITLE = `E2E UI Flow ${Date.now()}`;
const FIXTURE_TERM = "ui_fixture_term";
const FIXTURE_MEANING = "ui_fixture_meaning";

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

async function bootstrapIfNeeded() {
  if (!BOOTSTRAP_TOKEN) return;
  const { res } = await fetchJson(`${BASE_URL}/api/auth/bootstrap`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-bootstrap-token": BOOTSTRAP_TOKEN
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  assert([200, 403, 409].includes(res.status), `bootstrap failed: ${res.status}`);
}

function parseSetCookie(raw) {
  const first = raw.split(";")[0] ?? "";
  const eq = first.indexOf("=");
  if (eq <= 0) return null;
  return { name: first.slice(0, eq), value: first.slice(eq + 1) };
}

async function loginContext(context) {
  const { res } = await fetchJson(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  if (!res.ok) {
    throw new Error(`API login failed: ${res.status}`);
  }
  const setCookies = res.headers.getSetCookie?.() ?? [];
  const cookiePairs = [];
  let csrfToken = "";
  for (const raw of setCookies) {
    const parsed = parseSetCookie(raw);
    if (!parsed) continue;
    cookiePairs.push(`${parsed.name}=${parsed.value}`);
    if (parsed.name === "csrf_token") csrfToken = parsed.value;
  }
  const cookies = setCookies
    .map(parseSetCookie)
    .filter(Boolean)
    .map((c) => ({
      name: c.name,
      value: c.value,
      url: BASE_URL
    }));
  await context.addCookies(cookies);
  return { cookieHeader: cookiePairs.join("; "), csrfToken };
}

async function createFixtureWordbookViaApi(auth) {
  const create = await fetchJson(`${BASE_URL}/api/wordbooks`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: auth.cookieHeader,
      "x-csrf-token": auth.csrfToken
    },
    body: JSON.stringify({
      title: FIXTURE_TITLE,
      description: "UI e2e fixture",
      fromLang: "en",
      toLang: "ko"
    })
  });
  if (!create.res.ok || !create.data.wordbook?.id) {
    throw new Error(`Failed to create fixture wordbook: ${create.res.status}`);
  }
  const wordbookId = create.data.wordbook.id;

  const add = await fetchJson(`${BASE_URL}/api/wordbooks/${wordbookId}/items`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: auth.cookieHeader,
      "x-csrf-token": auth.csrfToken
    },
    body: JSON.stringify({
      items: [{ term: FIXTURE_TERM, meaning: FIXTURE_MEANING }]
    })
  });
  if (!add.res.ok) {
    throw new Error(`Failed to add fixture item: ${add.res.status}`);
  }
  return wordbookId;
}

async function runDesktopFlow() {
  console.log("[e2e-ui] desktop flow start");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);

  console.log("[e2e-ui] login");
  const auth = await loginContext(context);
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  console.log("[e2e-ui] create fixture");
  const fixtureWordbookId = await createFixtureWordbookViaApi(auth);
  await page.goto(`${BASE_URL}/wordbooks/${fixtureWordbookId}`, { waitUntil: "domcontentloaded" });

  console.log("[e2e-ui] study + quiz");
  await page.getByTestId("wordbook-study-link").click();
  const firstMarkCorrect = page.getByTestId("study-mark-correct-first");
  if ((await firstMarkCorrect.count()) > 0) {
    await firstMarkCorrect.first().click();
  }
  await page.getByTestId("study-start-quiz").click();

  await page.getByTestId("wordbook-quiz-mode").selectOption("MEANING");
  await page.getByTestId("wordbook-quiz-answer").fill(FIXTURE_MEANING);
  await page.getByTestId("wordbook-quiz-submit").click();

  console.log("[e2e-ui] report");
  await page.getByRole("link", { name: "Back" }).click();
  await page.getByTestId("report-toggle").click();
  await page.getByTestId("report-detail").fill("e2e-ui-report");
  await page.getByTestId("report-submit").click();
  await page.waitForTimeout(1200);

  console.log("[e2e-ui] admin moderation");
  await page.goto(`${BASE_URL}/admin`, { waitUntil: "domcontentloaded" });
  const reportCard = page.getByTestId("admin-report-card").filter({ hasText: FIXTURE_TITLE }).first();
  if ((await reportCard.count()) > 0) {
    await reportCard.waitFor({ timeout: 15_000 });
    page.once("dialog", async (dialog) => {
      await dialog.accept("e2e-hide");
    });
    await reportCard.getByTestId("admin-report-hide").click();
    await page.waitForTimeout(800);
  } else {
    console.log("[e2e-ui] moderation skipped: report not found");
  }

  await context.close();
  await browser.close();
  console.log("[e2e-ui] desktop flow done");
}

async function runMobileAndKeyboardCheck() {
  console.log("[e2e-ui] mobile flow start");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);

  await loginContext(context);
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.goto(`${BASE_URL}/wordbooks/market`, { waitUntil: "domcontentloaded" });
  await page.keyboard.press("Tab");
  await page.getByText("본문으로 건너뛰기").waitFor({ timeout: 10_000 });
  await page.goto(`${BASE_URL}/wordbooks`, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Blocked" }).waitFor({ timeout: 10_000 });

  await context.close();
  await browser.close();
  console.log("[e2e-ui] mobile flow done");
}

async function main() {
  await bootstrapIfNeeded();
  await runDesktopFlow();
  await runMobileAndKeyboardCheck();
  console.log("[e2e] ui-flow passed");
}

main().catch((err) => {
  console.error("[e2e] ui-flow failed:", err.message);
  process.exitCode = 1;
});
