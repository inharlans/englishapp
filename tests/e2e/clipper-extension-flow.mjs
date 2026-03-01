import path from "node:path";
import readline from "node:readline/promises";

import { chromium } from "playwright";

const BASE_URL = new URL(process.env.E2E_BASE_URL || "http://127.0.0.1:3000").origin;
const E2E_SECRET = process.env.E2E_SECRET || "";
const EMAIL = process.env.E2E_EMAIL || "e2e-clipped@example.com";
const EXTENSION_DIR = process.env.E2E_EXTENSION_DIR || path.resolve("extension");
const HEADLESS = process.env.E2E_HEADLESS === "1";
const MANUAL_LOGIN = process.env.E2E_MANUAL_LOGIN === "1";
const ALLOW_LEGACY_FALLBACK = process.env.E2E_ALLOW_LEGACY_FALLBACK === "1";

const FIXTURE_TITLE = `Clipper Ext E2E ${Date.now()} ${Math.random().toString(36).slice(2, 8)}`;
const INJECTED_DATA_ATTR = "data-englishapp-clipper-injected";
const CLICKED_DATA_ATTR = "data-englishapp-clipper-clicked";
const TOAST_DATA_ATTR = "data-englishapp-clipper-toast";
const TOAST_UPDATED_AT_ATTR = "data-englishapp-clipper-toast-updated-at";

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

async function readSelectionDebug(page) {
  return await page.evaluate(() => {
    const selection = window.getSelection();
    if (!selection) {
      return { exists: false, textLength: 0, textSample: "", rangeCount: 0, isCollapsed: true };
    }
    const text = selection.toString();
    return {
      exists: true,
      textLength: text.length,
      textSample: text.slice(0, 80),
      rangeCount: selection.rangeCount,
      isCollapsed: selection.isCollapsed
    };
  });
}

async function readButtonClickMarker(page) {
  try {
    return await page.evaluate((clickedDataAttr) => {
      return document.documentElement?.getAttribute(clickedDataAttr) || null;
    }, CLICKED_DATA_ATTR);
  } catch {
    return null;
  }
}

async function readButtonHitTest(page, box) {
  if (!box) return null;
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  try {
    return await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return null;
      return {
        tag: el.tagName,
        id: el.id || null,
        className: typeof el.className === "string" ? el.className : null,
        text: (el.textContent || "").slice(0, 80)
      };
    }, { x: centerX, y: centerY });
  } catch {
    return null;
  }
}

async function clickButtonWithFallbacks(page, addButton) {
  const attempts = [];

  const runAttempt = async (name, action) => {
    try {
      await action();
      await page.waitForTimeout(150);
      const marker = await readButtonClickMarker(page);
      const success = Boolean(marker);
      attempts.push({ name, ok: success, marker });
      return { success, marker };
    } catch (error) {
      attempts.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
      return { success: false, marker: null };
    }
  };

  let result = await runAttempt("locator.click", async () => {
    await addButton.click();
  });

  if (!result.success) {
    result = await runAttempt("locator.click.force", async () => {
      await addButton.click({ force: true });
    });
  }

  if (!result.success) {
    result = await runAttempt("mouse.click.center", async () => {
      const box = await addButton.boundingBox();
      assert(box, "button has no bounding box");
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    });
  }

  return { marker: result.marker, attempts };
}

async function dumpBridgeDebug(
  context,
  page,
  consoleLogs,
  swLogs,
  label,
  preClickSelection,
  postClickSelection,
  clickAttempts,
  buttonBox,
  buttonHit,
  clipperAddResponseDebug
) {
  const pageUrls = context.pages().map((candidate) => candidate.url());
  let marker = null;
  let injected = null;
  try {
    marker = await page.evaluate(() => window.__CLIPPER_BRIDGE_OPENED__ || null);
  } catch {
    marker = null;
  }
  try {
    injected = await page.evaluate((injectedDataAttr) => {
      return document.documentElement?.getAttribute(injectedDataAttr) || null;
    }, INJECTED_DATA_ATTR);
  } catch {
    injected = null;
  }
  const clipperLogs = consoleLogs
    .filter((entry) => entry.text.includes("CLIPPER_E2E"))
    .slice(-60);
  const clipperSwLogs = swLogs
    .filter((entry) => entry.text.includes("CLIPPER_E2E_BG"))
    .slice(-60);

  console.error(`[e2e-extension][debug] ${label}`);
  console.error(`[e2e-extension][debug] pages=${JSON.stringify(pageUrls)}`);
  console.error(`[e2e-extension][debug] marker=${JSON.stringify(marker)}`);
  console.error(`[e2e-extension][debug] injected=${JSON.stringify(injected)}`);
  console.error(`[e2e-extension][debug] preClickSelection=${JSON.stringify(preClickSelection)}`);
  console.error(`[e2e-extension][debug] postClickSelection=${JSON.stringify(postClickSelection)}`);
  console.error(`[e2e-extension][debug] clickAttempts=${JSON.stringify(clickAttempts)}`);
  console.error(`[e2e-extension][debug] buttonBox=${JSON.stringify(buttonBox)}`);
  console.error(`[e2e-extension][debug] elementFromPoint=${JSON.stringify(buttonHit)}`);
  console.error(`[e2e-extension][debug] clipperAddResponse=${JSON.stringify(clipperAddResponseDebug)}`);
  console.error(`[e2e-extension][debug] clipperLogs=${JSON.stringify(clipperLogs)}`);
  console.error(`[e2e-extension][debug] clipperSwLogs=${JSON.stringify(clipperSwLogs)}`);
}

async function runFlow(context, swLogs) {
  const page = await context.newPage();
  const consoleLogs = [];
  page.on("console", (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });
  await page.goto(`${BASE_URL}/clipper/extension-fixture`, { waitUntil: "domcontentloaded" });

  await page.waitForFunction((injectedDataAttr) => {
    return document.documentElement?.getAttribute(injectedDataAttr) === "1";
  }, INJECTED_DATA_ATTR, { timeout: 8000 }).catch(() => null);
  const injected = await page.evaluate((injectedDataAttr) => {
    return document.documentElement?.getAttribute(injectedDataAttr) || null;
  }, INJECTED_DATA_ATTR);
  if (injected !== "1") {
    await dumpBridgeDebug(
      context,
      page,
      consoleLogs,
      swLogs,
      "content_script_not_injected",
      null,
      null,
      [],
      null,
      null,
      null
    );
    throw new Error("content script was not injected");
  }

  const selectFixtureTerm = async () => {
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
  };

  const attemptSave = async (label) => {
    const waitForBridgePage = async (timeoutMs, pagesBefore) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const currentBridge = page.url().includes("/clipper/add?payload=") ? page : null;
        if (currentBridge) return currentBridge;
        const openedBridge = context.pages().find((candidate) => {
          if (pagesBefore.has(candidate)) return false;
          return candidate.url().includes("/clipper/add?payload=");
        }) || null;
        if (openedBridge) return openedBridge;
        await page.waitForTimeout(100);
      }
      return null;
    };

    await selectFixtureTerm();

    const addButton = page.locator('[data-englishapp-clipper="button"]');
    await addButton.waitFor({ timeout: 10000 });
    await page.evaluate((clickedDataAttr) => {
      document.documentElement?.removeAttribute(clickedDataAttr);
    }, CLICKED_DATA_ATTR);

    const buttonBox = await addButton.boundingBox();
    assert(buttonBox, "clipper add button has no bounding box");
    const buttonHit = await readButtonHitTest(page, buttonBox);
    const preClickSelection = await readSelectionDebug(page);
    const previousToastUpdatedAt = await page.evaluate((toastDataAttr, toastUpdatedAtAttr) => {
      const toast = document.querySelector(`[${toastDataAttr}="toast"]`);
      return toast?.getAttribute(toastUpdatedAtAttr) || null;
    }, TOAST_DATA_ATTR, TOAST_UPDATED_AT_ATTR);

    const clipperAddResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/clipper/add") && response.request().method() === "POST",
      { timeout: 10000 }
    ).catch(() => null);
    const pagesBeforeClick = new Set(context.pages());

    const clickResult = await clickButtonWithFallbacks(page, addButton);
    const postClickSelection = await readSelectionDebug(page);
    const unexpectedBridgePage = await waitForBridgePage(9000, pagesBeforeClick);
    const bridgePage = unexpectedBridgePage;
    const bridgeOpened = Boolean(bridgePage);

    const clipperAddResponse = bridgeOpened
      ? await Promise.race([clipperAddResponsePromise, page.waitForTimeout(300).then(() => null)])
      : await clipperAddResponsePromise;
    let clipperAddResponseDebug = null;
    if (clipperAddResponse) {
      let bodyPreview = null;
      let parsedBody = null;
      let bodyText = null;
      try {
        bodyText = await clipperAddResponse.text();
      } catch {
        bodyText = null;
      }
      if (bodyText) {
        try {
          parsedBody = JSON.parse(bodyText);
        } catch {
          parsedBody = null;
        }
        bodyPreview = bodyText.slice(0, 500);
      }
      clipperAddResponseDebug = {
        url: (() => {
          try {
            const parsed = new URL(clipperAddResponse.url());
            return `${parsed.origin}${parsed.pathname}`;
          } catch {
            return clipperAddResponse.url();
          }
        })(),
        status: clipperAddResponse.status(),
        bodyPreview,
        statusValue: parsedBody?.status || null,
        errorValue: parsedBody?.error || null
      };
    }

    const statusCode = Number(clipperAddResponseDebug?.status || 0);
    const statusValue = clipperAddResponseDebug?.statusValue;
    if (!bridgeOpened) {
      assert(!page.url().includes("/clipper/add?payload="), `${label}: current page navigated to bridge add page`);
      assert(!unexpectedBridgePage, `${label}: unexpected bridge page opened`);
    }

    if (bridgeOpened) {
      assert(ALLOW_LEGACY_FALLBACK, `${label}: legacy fallback opened unexpectedly`);
      const fallbackPage = bridgePage;
      assert(Boolean(fallbackPage), `${label}: fallback page handle missing`);
      await fallbackPage.waitForURL(/\/clipper\/add\?payload=/, { timeout: 10000 }).catch(() => null);
      const fallbackBodyText = await fallbackPage.textContent("body").catch(() => null);
      const fallbackSucceeded = Boolean(
        fallbackBodyText?.includes("단어장에 추가했습니다") || fallbackBodyText?.includes("이미 같은 단어")
      );
      assert(fallbackSucceeded, `${label}: fallback bridge success message missing`);
      console.log(`[e2e-extension][case] ${label} legacy-fallback-opened statusCode=${statusCode}`);
      return {
        preClickSelection,
        postClickSelection,
        clickAttempts: clickResult.attempts,
        buttonBox,
        buttonHit,
        clipperAddResponseDebug,
        statusCode,
        statusValue,
        toastText: "",
        legacyFallbackOpened: true
      };
    }

    await page.waitForFunction(
      ({ toastDataAttr, toastUpdatedAtAttr, prevValue }) => {
        const toast = document.querySelector(`[${toastDataAttr}="toast"]`);
        if (!toast) return false;
        const updatedAt = toast.getAttribute(toastUpdatedAtAttr);
        if (!updatedAt) return false;
        return updatedAt !== prevValue;
      },
      {
        toastDataAttr: TOAST_DATA_ATTR,
        toastUpdatedAtAttr: TOAST_UPDATED_AT_ATTR,
        prevValue: previousToastUpdatedAt
      },
      { timeout: 10000 }
    );
    const toastText = await page.evaluate((toastDataAttr) => {
      const toast = document.querySelector(`[${toastDataAttr}="toast"]`);
      return (toast?.textContent || "").trim();
    }, TOAST_DATA_ATTR);

    if ((statusCode === 200 || statusCode === 201) && !statusValue) {
      throw new Error(`${label}: clipper status missing for ${statusCode}`);
    }

    if (statusValue === "created") {
      assert(toastText.includes("저장되었습니다"), `${label}: created toast mismatch (${toastText})`);
    } else if (statusValue === "duplicate") {
      assert(toastText.includes("이미"), `${label}: duplicate toast mismatch (${toastText})`);
    } else if (statusCode === 401 || statusCode === 403) {
      assert(toastText.includes("로그인"), `${label}: auth toast mismatch (${toastText})`);
    } else if (statusCode === 422) {
      assert(toastText.includes("기본 단어장"), `${label}: default wordbook toast mismatch (${toastText})`);
    } else if (statusCode >= 500 || statusCode === 0) {
      assert(toastText.includes("저장 실패"), `${label}: error toast mismatch (${toastText})`);
    } else {
      throw new Error(
        `${label}: unhandled save status (statusCode=${statusCode}, statusValue=${statusValue || "n/a"}, body=${clipperAddResponseDebug?.bodyPreview || "n/a"})`
      );
    }

    console.log(
      `[e2e-extension][case] ${label} statusCode=${statusCode} status=${statusValue || "n/a"} toast=${toastText}`
    );

    return {
      preClickSelection,
      postClickSelection,
      clickAttempts: clickResult.attempts,
      buttonBox,
      buttonHit,
      clipperAddResponseDebug,
      statusCode,
      statusValue,
      toastText,
      legacyFallbackOpened: false
    };
  };

  let first;
  let second;
  try {
    first = await attemptSave("first");
    if (first.legacyFallbackOpened) {
      console.log("[e2e-extension][case] legacy fallback path observed via E2E_ALLOW_LEGACY_FALLBACK=1");
      return;
    }
    second = await attemptSave("second");
    if (first.legacyFallbackOpened || second.legacyFallbackOpened) {
      console.log("[e2e-extension][case] legacy fallback path observed via E2E_ALLOW_LEGACY_FALLBACK=1");
      return;
    }
    console.log(
      `[e2e-extension][case] duplicate-check statusCode=${second.statusCode} status=${second.statusValue || "n/a"}`
    );

    const statuses = [first.statusValue, second.statusValue].filter(Boolean);
    assert(statuses.length >= 2, "clipper add status logs missing");
    assert(first.statusValue === "created" || first.statusValue === "duplicate", "first save status mismatch");
    assert(second.statusValue === "duplicate", "duplicate check did not return duplicate");
    assert(page.url().includes("/clipper/extension-fixture"), "page navigated unexpectedly");
  } catch (error) {
    const latest = second || first;
    await dumpBridgeDebug(
      context,
      page,
      consoleLogs,
      swLogs,
      "save_flow_failed",
      latest?.preClickSelection || null,
      latest?.postClickSelection || null,
      latest?.clickAttempts || [],
      latest?.buttonBox || null,
      latest?.buttonHit || null,
      latest?.clipperAddResponseDebug || null
    );
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
  const swLogs = [];

  try {
    const serviceWorker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    serviceWorker.on("console", (msg) => {
      swLogs.push({ type: msg.type(), text: msg.text() });
    });
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
    await runFlow(context, swLogs);
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
