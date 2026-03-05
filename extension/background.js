const DEFAULT_BRIDGE_ORIGIN = "https://www.oingapp.com";
const TERM_MAX = 64;
const EXAMPLE_MAX = 500;
const CONTEXT_MENU_ADD_WORD = "englishapp-clipper-add-word";
const ALLOWED_BRIDGE_HOSTS = new Set([
  "oingapp.com",
  "www.oingapp.com",
  "localhost",
  "127.0.0.1"
]);

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

function sanitizeSourceUrl(raw) {
  const cleaned = normalizeSpace(raw || "");
  if (!cleaned) {
    return undefined;
  }
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol === "file:") {
      return undefined;
    }
  } catch {
    // ignore parse failure and fallback to sanitized text
  }
  return cleaned;
}

function sanitizeBridgeOrigin(candidate) {
  try {
    const parsed = new URL(candidate);
    const isAllowedHost = ALLOWED_BRIDGE_HOSTS.has(parsed.hostname);
    const isHttps = parsed.protocol === "https:";
    const isLocalHttp = parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
    if (isAllowedHost && (isHttps || isLocalHttp)) {
      return parsed.origin;
    }
  } catch {
    // no-op
  }
  return null;
}

logBackground("service_worker_ready");

function resolveSafeBridgeOrigin(callback) {
  chrome.storage.sync.get(["bridgeOrigin"], (storage) => {
    const bridgeOrigin = typeof storage.bridgeOrigin === "string" && storage.bridgeOrigin.startsWith("http")
      ? sanitizeBridgeOrigin(storage.bridgeOrigin)
      : null;
    const safeBridgeOrigin = bridgeOrigin || sanitizeBridgeOrigin(DEFAULT_BRIDGE_ORIGIN) || DEFAULT_BRIDGE_ORIGIN;
    callback(safeBridgeOrigin);
  });
}

function buildBridgeUrl(input) {
  const payload = {
    term: sanitizeTerm(input.term || ""),
    exampleSentenceEn: input.exampleSentenceEn ? sanitizeExample(input.exampleSentenceEn) : undefined,
    sourceUrl: sanitizeSourceUrl(input.sourceUrl),
    sourceTitle: normalizeSpace(input.sourceTitle || "") || undefined
  };
  if (!payload.term) {
    return null;
  }

  const encoded = base64UrlEncodeUtf8(JSON.stringify(payload));
  return {
    payload,
    toUrl(bridgeOrigin) {
      return `${bridgeOrigin.replace(/\/$/, "")}/clipper/add?payload=${encodeURIComponent(encoded)}`;
    }
  };
}

function openBridgeUrl(url, sendResponse) {
  if (!globalThis.clients || typeof globalThis.clients.openWindow !== "function") {
    logBackground("open_window_unavailable");
    if (sendResponse) {
      sendResponse({ ok: true, mode: "delegate", status: "openWindowUnavailable", url });
    }
    return;
  }

  globalThis.clients.openWindow(url)
    .then((client) => {
      if (client) {
        logBackground("open_window_success");
        if (sendResponse) {
          sendResponse({ ok: true, mode: "openWindow", status: "opened", url });
        }
        return;
      }
      logBackground("open_window_no_client");
      if (sendResponse) {
        sendResponse({ ok: true, mode: "delegate", status: "openWindowNoClient", url });
      }
    })
    .catch((error) => {
      const messageText = error instanceof Error ? error.message : String(error);
      logBackground("open_window_failed", { error: messageText });
      if (sendResponse) {
        sendResponse({
          ok: true,
          mode: "delegate",
          status: "openWindowFailed",
          url,
          message: messageText
        });
      }
    });
}

function installContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ADD_WORD,
      title: "단어장에 추가",
      contexts: ["selection"]
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  installContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
  installContextMenu();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ADD_WORD) {
    return;
  }
  const bridgePayload = buildBridgeUrl({
    term: info.selectionText || "",
    sourceUrl: info.pageUrl || tab?.url || "",
    sourceTitle: tab?.title || ""
  });
  if (!bridgePayload) {
    return;
  }

  resolveSafeBridgeOrigin((bridgeOrigin) => {
    const url = bridgePayload.toUrl(bridgeOrigin);
    openBridgeUrl(url);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "openClipperBridge") return;
  const bridgePayload = buildBridgeUrl({
    term: message.payload?.term || "",
    exampleSentenceEn: message.payload?.exampleSentenceEn,
    sourceUrl: message.payload?.sourceUrl,
    sourceTitle: message.payload?.sourceTitle
  });
  if (!bridgePayload) {
    sendResponse({ ok: false, error: "TERM_EMPTY" });
    return true;
  }

  resolveSafeBridgeOrigin((bridgeOrigin) => {
    const url = bridgePayload.toUrl(bridgeOrigin);

    if (!globalThis.clients || typeof globalThis.clients.openWindow !== "function") {
      sendResponse({ ok: true, mode: "delegate", status: "openWindowUnavailable", url });
      return;
    }

    logBackground("open_window_start", { senderUrl: sender?.url || null });
    openBridgeUrl(url, sendResponse);
  });
  return true;
});
