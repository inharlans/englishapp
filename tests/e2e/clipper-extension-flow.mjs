import path from "node:path";
import readline from "node:readline/promises";

import { chromium } from "playwright";

const BASE_URL = new URL(process.env.E2E_BASE_URL || "http://127.0.0.1:3000").origin;
const E2E_SECRET = process.env.E2E_SECRET || "";
const EMAIL = process.env.E2E_EMAIL || "e2e-clipped@example.com";
const EXTENSION_DIR = process.env.E2E_EXTENSION_DIR || path.resolve("extension");
const HEADLESS = process.env.E2E_HEADLESS === "1";
const MANUAL_LOGIN = process.env.E2E_MANUAL_LOGIN === "1";

const FIXTURE_TITLE = `Clipper Ext E2E ${Date.now()} ${Math.random().toString(36).slice(2, 8)}`;

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

async function getCurrentDefaultWordbookId(auth) {
  const { res, data } = await fetchJson(`${BASE_URL}/api/users/me/clipper-settings`, {
    method: "GET",
    headers: {
      cookie: auth.cookieHeader
    }
  });
  assert(res.ok, `clipper settings get failed: ${res.status} ${JSON.stringify(data)}`);
  return typeof data.defaultWordbookId === "number" ? data.defaultWordbookId : null;
}

async function setDefaultWordbook(auth, wordbookId) {
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
  assert(patch.res.ok, `clipper settings patch failed: ${patch.res.status} ${JSON.stringify(patch.data)}`);
}

async function deleteWordbook(auth, wordbookId) {
  const removed = await fetchJson(`${BASE_URL}/api/wordbooks/${wordbookId}`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      cookie: auth.cookieHeader,
      "x-csrf-token": auth.csrf,
      origin: BASE_URL,
      referer: `${BASE_URL}/wordbooks`
    }
  });
  assert(removed.res.ok, `wordbook delete failed: ${removed.res.status} ${JSON.stringify(removed.data)}`);
}

async function ensureDefaultWordbook(auth) {
  const listed = await fetchJson(`${BASE_URL}/api/wordbooks`, {
    method: "GET",
    headers: {
      cookie: auth.cookieHeader
    }
  });
  assert(listed.res.ok, `wordbook list failed: ${listed.res.status} ${JSON.stringify(listed.data)}`);
  const found = (listed.data.wordbooks ?? []).find((wordbook) => wordbook?.title === FIXTURE_TITLE);
  if (typeof found?.id === "number") {
    await setDefaultWordbook(auth, found.id);
    return { createdWordbookId: null };
  }

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
  assert(res.ok, `wordbook create failed: ${res.status} ${JSON.stringify(data)}`);
  const wordbookId = data.wordbook?.id;
  assert(wordbookId, "wordbook id missing");
  await setDefaultWordbook(auth, wordbookId);
  return { createdWordbookId: wordbookId };
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

    const listedRes = await fetch("/api/wordbooks", {
      method: "GET",
      credentials: "include"
    });
    const listedJson = await listedRes.json().catch(() => ({}));
    if (!listedRes.ok) {
      return { ok: false, step: "list", status: listedRes.status };
    }
    const existing = (listedJson.wordbooks ?? []).find((wordbook) => wordbook?.title === payload.title);
    const existingId = typeof existing?.id === "number" ? existing.id : null;

    let createdId = existingId;
    if (!createdId) {
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
      createdId = createJson.wordbook.id;
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
      body: JSON.stringify({
        defaultWordbookId: createdId
      })
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

async function dumpBridgeDebug(context, page, consoleLogs, label) {
  const pageUrls = context.pages().map((candidate) => candidate.url());
  let marker = null;
  try {
    marker = await page.evaluate(() => window.__CLIPPER_BRIDGE_OPENED__ || null);
  } catch {
    marker = null;
  }
  const clipperLogs = consoleLogs
    .filter((entry) => entry.text.includes("CLIPPER_E2E"))
    .slice(-60);

  console.error(`[e2e-extension][debug] ${label}`);
  console.error(`[e2e-extension][debug] pages=${JSON.stringify(pageUrls)}`);
  console.error(`[e2e-extension][debug] marker=${JSON.stringify(marker)}`);
  console.error(`[e2e-extension][debug] clipperLogs=${JSON.stringify(clipperLogs)}`);
}

async function runFlow(context) {
  const page = await context.newPage();
  const consoleLogs = [];
  page.on("console", (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });
  await page.goto(`${BASE_URL}/clipper/extension-fixture`, { waitUntil: "domcontentloaded" });

  const target = page.locator("p strong", { hasText: "example" });
  await target.waitFor({ timeout: 10000 });
  const box = await target.boundingBox();
  assert(box, "selection target missing");
  const startX = box.x + 2;
  const endX = box.x + Math.max(3, box.width - 2);
  const y = box.y + box.height / 2;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(endX, y, { steps: 8 });
  await page.mouse.up();

  const addButton = page.locator("#englishapp-clipper-btn");
  await addButton.waitFor({ timeout: 10000 });

  const openBridgePattern = new RegExp(`${BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/clipper/add\\?payload=`);
  const pagesBeforeClick = new Set(context.pages());
  const openedPagePromise = context.waitForEvent("page", { timeout: 7000 }).catch(() => null);
  await addButton.click();
  const [samePageNavigated, openedPage] = await Promise.all([
    page
      .waitForURL(openBridgePattern, { timeout: 5000 })
      .then(() => true)
      .catch(() => false),
    openedPagePromise
  ]);
  if (samePageNavigated) {
    const bodyText = await page.textContent("body");
    assert(
      bodyText?.includes("단어장에 추가했습니다") || bodyText?.includes("이미 같은 단어"),
      "bridge success message missing"
    );
    return;
  }

  try {
    let bridgePage = openedPage;
    if (!bridgePage) {
      await page.waitForTimeout(2000);
      if (page.url().includes("/clipper/add?payload=")) {
        bridgePage = page;
      }
    }
    if (!bridgePage) {
      const pages = context.pages();
      bridgePage = pages.find((candidate) => {
        if (pagesBeforeClick.has(candidate)) return false;
        return candidate.url().includes("/clipper/add?payload=");
      }) ?? null;
    }
    assert(Boolean(bridgePage), "bridge page did not open");
    await bridgePage.waitForURL(openBridgePattern, { timeout: 10000 });
    const bodyText = await bridgePage.textContent("body");
    assert(
      bodyText?.includes("단어장에 추가했습니다") || bodyText?.includes("이미 같은 단어"),
      "bridge success message missing"
    );
  } catch (error) {
    await dumpBridgeDebug(context, page, consoleLogs, "bridge_open_failed");
    throw error;
  }
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

  let auth = null;
  let originalDefaultWordbookId = null;
  let shouldRestoreDefaultWordbook = false;
  let createdWordbookId = null;
  let restoreDefaultSucceeded = false;

  try {
    const serviceWorker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    const extensionId = new URL(serviceWorker.url()).host;

    auth = await getE2eSession();
    if (auth && !MANUAL_LOGIN) {
      originalDefaultWordbookId = await getCurrentDefaultWordbookId(auth);
      shouldRestoreDefaultWordbook = true;
      const setup = await ensureDefaultWordbook(auth);
      createdWordbookId = setup.createdWordbookId;
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
    if (auth && !MANUAL_LOGIN && shouldRestoreDefaultWordbook) {
      try {
        if (typeof originalDefaultWordbookId === "number") {
          await setDefaultWordbook(auth, originalDefaultWordbookId);
          restoreDefaultSucceeded = true;
        } else if (originalDefaultWordbookId === null) {
          await setDefaultWordbook(auth, null);
          restoreDefaultSucceeded = true;
        }
      } catch (error) {
        console.error(
          "[e2e-extension] cleanup failed: restore default wordbook",
          error instanceof Error ? error.message : String(error)
        );
      }
    }
    if (auth && !MANUAL_LOGIN && createdWordbookId) {
      if (shouldRestoreDefaultWordbook && !restoreDefaultSucceeded) {
        console.error(
          `[e2e-extension] cleanup skipped: fixture delete blocked until default restore succeeds (wordbook ${createdWordbookId})`
        );
      } else {
        try {
          await deleteWordbook(auth, createdWordbookId);
        } catch (error) {
          console.error(
            `[e2e-extension] cleanup failed: delete fixture wordbook ${createdWordbookId}`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }
    }
    await context.close();
  }
}

main().catch((error) => {
  console.error("[e2e-extension] failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
