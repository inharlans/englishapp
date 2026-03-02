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

logBackground("service_worker_ready");

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

    if (!globalThis.clients || typeof globalThis.clients.openWindow !== "function") {
      sendResponse({ ok: true, mode: "delegate", status: "openWindowUnavailable", url });
      return;
    }

    logBackground("open_window_start", { senderUrl: sender?.url || null });
    globalThis.clients.openWindow(url)
      .then((client) => {
        if (client) {
          logBackground("open_window_success");
          sendResponse({ ok: true, mode: "openWindow", status: "opened", url });
          return;
        }
        logBackground("open_window_no_client");
        sendResponse({ ok: true, mode: "delegate", status: "openWindowNoClient", url });
      })
      .catch((error) => {
        const messageText = error instanceof Error ? error.message : String(error);
        logBackground("open_window_failed", { error: messageText });
        sendResponse({
          ok: true,
          mode: "delegate",
          status: "openWindowFailed",
          url,
          message: messageText
        });
      });
  });
  return true;
});
