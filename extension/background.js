const DEFAULT_BRIDGE_ORIGIN = "https://www.oingapp.com";
const TERM_MAX = 64;
const EXAMPLE_MAX = 500;

function logBackground(step, extra = {}) {
  try {
    console.log(JSON.stringify({ tag: "CLIPPER_E2E_BG", step, ts: Date.now(), ...extra }));
  } catch {
    // no-op
  }
}

function base64UrlEncodeUtf8(value) {
  const utf8 = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of utf8) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function normalizeSpace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function sanitizeTerm(raw) {
  return normalizeSpace(raw).replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, "").slice(0, TERM_MAX);
}

function sanitizeExample(raw) {
  return normalizeSpace(raw).slice(0, EXAMPLE_MAX);
}

function isE2eFixtureSender(senderUrl) {
  try {
    const parsed = new URL(senderUrl || "");
    return parsed.pathname === "/clipper/extension-fixture" || parsed.pathname === "/clipper/extension-fixture/";
  } catch {
    return false;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "openClipperBridge") return;
  chrome.storage.sync.get(["bridgeOrigin"], (storage) => {
    const bridgeOrigin = typeof storage.bridgeOrigin === "string" && storage.bridgeOrigin.startsWith("http")
      ? storage.bridgeOrigin
      : DEFAULT_BRIDGE_ORIGIN;

    const term = sanitizeTerm(message.payload?.term || "");
    if (!term) {
      sendResponse({ ok: false, error: "TERM_EMPTY" });
      return;
    }

    const exampleSentenceEn = message.payload?.exampleSentenceEn
      ? sanitizeExample(message.payload.exampleSentenceEn)
      : undefined;

    const payload = {
      term,
      exampleSentenceEn,
      sourceUrl: normalizeSpace(message.payload?.sourceUrl || "") || undefined,
      sourceTitle: normalizeSpace(message.payload?.sourceTitle || "") || undefined
    };

    const encoded = base64UrlEncodeUtf8(JSON.stringify(payload));
    const url = `${bridgeOrigin.replace(/\/$/, "")}/clipper/add?payload=${encodeURIComponent(encoded)}`;

    const senderTabId = sender?.tab?.id;
    const useSameTab = Number.isInteger(senderTabId) && isE2eFixtureSender(sender?.url);

    if (useSameTab) {
      logBackground("tabs_update_start", { senderTabId });
      chrome.tabs.update(senderTabId, { url }, () => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          const errorMessage = lastError.message || "TAB_UPDATE_FAILED";
          logBackground("tabs_update_failed", { error: errorMessage, senderTabId });
          sendResponse({ ok: false, error: "tabs_update_failed", message: errorMessage });
          return;
        }
        logBackground("tabs_update_success", { senderTabId });
        sendResponse({ ok: true, mode: "update", tabId: senderTabId });
      });
      return;
    }

    logBackground("tabs_create_start");
    chrome.tabs.create({ url }, (tab) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        const errorMessage = lastError.message || "TAB_CREATE_FAILED";
        logBackground("tabs_create_failed", { error: errorMessage });
        sendResponse({ ok: false, error: "tabs_create_failed", message: errorMessage });
        return;
      }
      logBackground("tabs_create_success", { tabId: tab?.id || null });
      sendResponse({ ok: true, mode: "create", tabId: tab?.id || null });
    });
  });
  return true;
});
