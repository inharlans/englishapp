import path from "node:path";
import readline from "node:readline/promises";

import { chromium } from "playwright";

const BASE_URL = new URL(process.env.E2E_BASE_URL || "http://127.0.0.1:3000").origin;
const E2E_SECRET = process.env.E2E_SECRET || "";
const EMAIL = process.env.E2E_EMAIL || "e2e-clipped@example.com";
const EXTENSION_DIR = process.env.E2E_EXTENSION_DIR || path.resolve("extension");
const HEADLESS = process.env.E2E_HEADLESS === "1";
const MANUAL_LOGIN = process.env.E2E_MANUAL_LOGIN === "1";

const FIXTURE_TITLE = `Clipper Ext E2E ${Date.now()}`;

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
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const combined = headers.get("set-cookie");
  if (!combined) return [];
  return combined.split(/,\s*(?=[^;,=\s]+=)/g);
}

function parseCookieNameValue(raw) {
  const first = raw.split(";")[0] ?? "";
  const eq = first.indexOf("=");
  if (eq <= 0) return null;
  return { name: first.slice(0, eq), value: first.slice(eq + 1) };
}

async function getE2eSession() {
  if (!E2E_SECRET) return null;
  const res = await fetch(`${BASE_URL}/api/internal/e2e/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-e2e-secret": E2E_SECRET
    },
    body: JSON.stringify({ email: EMAIL })
  });
  assert(res.ok, `internal e2e login failed: ${res.status}`);
  const setCookies = parseSetCookie(res.headers);
  const cookies = setCookies
    .map(parseCookieNameValue)
    .filter(Boolean)
    .map((item) => ({
      name: item.name,
      value: item.value
    }));

  const csrf = cookies.find((cookie) => cookie.name === "csrf_token")?.value || "";
  const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  return { cookies, csrf, cookieHeader };
}

async function ensureDefaultWordbook(auth) {
  const { res, data } = await fetchJson(`${BASE_URL}/api/wordbooks`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: auth.cookieHeader,
      "x-csrf-token": auth.csrf,
      origin: BASE_URL,
      referer: `${BASE_URL}/wordbooks`
    },
    body: JSON.stringify({
      title: FIXTURE_TITLE,
      description: "Clipper extension e2e fixture",
      fromLang: "en",
      toLang: "ko"
    })
  });
  assert(res.ok, `wordbook create failed: ${res.status}`);
  const wordbookId = data.wordbook?.id;
  assert(wordbookId, "wordbook id missing");

  const patch = await fetchJson(`${BASE_URL}/api/users/me/clipper-settings`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: auth.cookieHeader,
      "x-csrf-token": auth.csrf,
      origin: BASE_URL,
      referer: `${BASE_URL}/wordbooks`
    },
    body: JSON.stringify({ defaultWordbookId: wordbookId })
  });
  assert(patch.res.ok, `clipper settings patch failed: ${patch.res.status}`);
}

async function promptManualLogin(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  console.log("[e2e-extension] 브라우저에서 로그인 후 터미널에서 Enter를 눌러 주세요.");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await rl.question("");
  rl.close();
}

async function ensureDefaultWordbookFromBrowser(page) {
  await page.goto(`${BASE_URL}/wordbooks`, { waitUntil: "domcontentloaded" });
  const result = await page.evaluate(async (payload) => {
    const csrfCookie = document.cookie
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith("csrf_token=")) ?? "";
    const csrfEq = csrfCookie.indexOf("=");
    const csrf = csrfEq >= 0 ? csrfCookie.slice(csrfEq + 1) : "";

    const createRes = await fetch("/api/wordbooks", {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrf,
        origin: window.location.origin,
        referer: `${window.location.origin}/wordbooks`
      },
      body: JSON.stringify({
        title: payload.title,
        description: "Clipper extension e2e fixture",
        fromLang: "en",
        toLang: "ko"
      })
    });
    const createJson = await createRes.json().catch(() => ({}));
    if (!createRes.ok || !createJson.wordbook?.id) {
      return { ok: false, step: "create", status: createRes.status };
    }

    const patchRes = await fetch("/api/users/me/clipper-settings", {
      method: "PATCH",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrf,
        origin: window.location.origin,
        referer: `${window.location.origin}/wordbooks`
      },
      body: JSON.stringify({ defaultWordbookId: createJson.wordbook.id })
    });

    if (!patchRes.ok) {
      return { ok: false, step: "patch", status: patchRes.status };
    }
    return { ok: true };
  }, { title: FIXTURE_TITLE });

  assert(result?.ok, `manual default wordbook setup failed (${result?.step ?? "unknown"}:${result?.status ?? "n/a"})`);
}

async function configureBridgeOrigin(context, extensionId) {
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`, { waitUntil: "domcontentloaded" });
  await options.fill("#bridgeOrigin", BASE_URL);
  await options.click("#saveBtn");
  await options.waitForFunction(() => {
    const status = document.querySelector("#status");
    return Boolean(status && status.textContent && status.textContent.trim().length > 0 && !status.textContent.includes("실패"));
  });
  const savedBridgeOrigin = await options.evaluate(async () => {
    return await new Promise((resolve) => {
      chrome.storage.sync.get(["bridgeOrigin"], (storage) => {
        resolve(typeof storage.bridgeOrigin === "string" ? storage.bridgeOrigin : "");
      });
    });
  });
  assert(savedBridgeOrigin === BASE_URL, `bridgeOrigin was not saved: ${savedBridgeOrigin}`);
  await options.close();
}

async function runFlow(context) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/clipper/extension-fixture`, { waitUntil: "domcontentloaded" });

  await page.evaluate(() => {
    const strong = document.querySelector("p strong");
    if (!strong || !strong.firstChild) throw new Error("selection target missing");
    const node = strong.firstChild;
    const text = node.textContent || "";
    const needle = "example";
    const start = text.toLowerCase().indexOf(needle);
    if (start < 0) throw new Error("selection target missing");
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, start + needle.length);
    const selection = window.getSelection();
    if (!selection) throw new Error("selection unavailable");
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });

  const addButton = page.locator("#englishapp-clipper-btn");
  await addButton.waitFor({ timeout: 10000 });

  const openedPagePromise = context.waitForEvent("page");
  await addButton.click();
  const bridgePage = await openedPagePromise;
  await bridgePage.waitForURL(new RegExp(`${BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/clipper/add\\?payload=`), {
    timeout: 10000
  });
  const bodyText = await bridgePage.textContent("body");
  assert(
    bodyText?.includes("단어장에 추가했습니다") || bodyText?.includes("이미 같은 단어"),
    "bridge success message missing"
  );
}

async function main() {
  if (!E2E_SECRET && !MANUAL_LOGIN) {
    throw new Error("E2E_SECRET이 없으면 E2E_MANUAL_LOGIN=1이 필요합니다.");
  }
  if (MANUAL_LOGIN && !process.stdin.isTTY) {
    throw new Error("MANUAL_LOGIN 모드는 TTY 환경에서만 실행할 수 있습니다.");
  }

  const context = await chromium.launchPersistentContext("", {
    headless: HEADLESS,
    args: [
      `--disable-extensions-except=${EXTENSION_DIR}`,
      `--load-extension=${EXTENSION_DIR}`
    ]
  });

  try {
    const serviceWorker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    const extensionId = new URL(serviceWorker.url()).host;

    const auth = await getE2eSession();
    if (auth && !MANUAL_LOGIN) {
      await ensureDefaultWordbook(auth);
      await context.addCookies(
        auth.cookies.map((cookie) => ({
          ...cookie,
          url: BASE_URL
        }))
      );
    } else {
      const loginPage = await context.newPage();
      await promptManualLogin(loginPage);
      await ensureDefaultWordbookFromBrowser(loginPage);
      await loginPage.close();
    }

    await configureBridgeOrigin(context, extensionId);
    await runFlow(context);
    console.log("[e2e-extension] passed");
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error("[e2e-extension] failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
