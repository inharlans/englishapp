(() => {
  const BUTTON_ID = "englishapp-clipper-btn";
  const MIN_TERM_LEN = 2;
  const DEFAULT_BRIDGE_ORIGIN = "https://www.oingapp.com";

  let button = null;

  function normalizeSpace(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function sanitizeTerm(raw) {
    return normalizeSpace(raw).replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, "").slice(0, 64);
  }

  function base64UrlEncodeUtf8(value) {
    const utf8 = new TextEncoder().encode(value);
    let binary = "";
    for (const byte of utf8) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function inferExampleFromSelection(selection) {
    const raw = normalizeSpace(selection.toString());
    if (!raw) return "";

    // 문장 드래그로 보이면 그대로 사용
    if (raw.length >= 20 && /[.?!]$/.test(raw)) {
      return raw.slice(0, 500);
    }

    // 단어 드래그면 주변 텍스트에서 문장 경계 추출 시도
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const container = range?.commonAncestorContainer?.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer
      : range?.commonAncestorContainer?.firstChild;
    const text = normalizeSpace(container?.textContent || "");
    if (!text) return "";

    const idx = text.toLowerCase().indexOf(raw.toLowerCase());
    if (idx < 0) return "";

    const left = text.slice(0, idx);
    const right = text.slice(idx + raw.length);

    const leftBoundary = Math.max(left.lastIndexOf("."), left.lastIndexOf("?"), left.lastIndexOf("!"));
    const nextPunct = [right.indexOf("."), right.indexOf("?"), right.indexOf("!")]
      .filter((n) => n >= 0)
      .sort((a, b) => a - b)[0];

    const start = leftBoundary >= 0 ? leftBoundary + 1 : Math.max(0, idx - 120);
    const end = typeof nextPunct === "number" ? idx + raw.length + nextPunct + 1 : Math.min(text.length, idx + raw.length + 120);
    return normalizeSpace(text.slice(start, end)).slice(0, 500);
  }

  function removeButton() {
    if (button) {
      button.remove();
      button = null;
    }
  }

  function openBridgeInPage(payload) {
    chrome.storage.sync.get(["bridgeOrigin"], (storage) => {
      const bridgeOrigin = typeof storage.bridgeOrigin === "string" && storage.bridgeOrigin.startsWith("http")
        ? storage.bridgeOrigin
        : DEFAULT_BRIDGE_ORIGIN;
      const encoded = base64UrlEncodeUtf8(JSON.stringify(payload));
      const url = `${bridgeOrigin.replace(/\/$/, "")}/clipper/add?payload=${encodeURIComponent(encoded)}`;
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) location.href = url;
    });
  }

  function createButton(x, y, onClick) {
    removeButton();
    button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "단어장에 추가";
    button.className = "englishapp-clipper-btn";
    button.style.left = `${x}px`;
    button.style.top = `${y}px`;
    button.addEventListener("mousedown", (e) => e.preventDefault());
    button.addEventListener("click", onClick);
    document.body.appendChild(button);
  }

  function onMouseUp() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      removeButton();
      return;
    }

    const term = sanitizeTerm(selection.toString());
    if (term.length < MIN_TERM_LEN) {
      removeButton();
      return;
    }

    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const rect = range?.getBoundingClientRect();
    if (!rect) {
      removeButton();
      return;
    }

    const exampleSentenceEn = inferExampleFromSelection(selection);

    createButton(rect.right + window.scrollX + 8, rect.top + window.scrollY - 4, () => {
      const payload = {
        term,
        exampleSentenceEn,
        sourceUrl: location.href,
        sourceTitle: document.title
      };
      chrome.runtime.sendMessage({
        type: "openClipperBridge",
        payload
      }, (response) => {
        const sendError = chrome.runtime.lastError;
        if (sendError || !response?.ok) {
          openBridgeInPage(payload);
        }
      });
      removeButton();
      selection.removeAllRanges();
    });
  }

  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("scroll", removeButton, true);
  document.addEventListener("mousedown", (event) => {
    if (button && event.target !== button) {
      removeButton();
    }
  });
})();
