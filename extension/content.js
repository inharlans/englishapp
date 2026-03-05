(() => {
  const BUTTON_ID = "englishapp-clipper-btn";
  const BUTTON_DATA_ATTR = "data-englishapp-clipper";
  const TOAST_DATA_ATTR = "data-englishapp-clipper-toast";
  const TOAST_UPDATED_AT_ATTR = "data-englishapp-clipper-toast-updated-at";
  const INJECTED_DATA_ATTR = "data-englishapp-clipper-injected";
  const CLICKED_DATA_ATTR = "data-englishapp-clipper-clicked";
  const BRIDGE_REQ_TYPE = "OING_CLIPPER_SAVE_REQ";
  const BRIDGE_ABORT_TYPE = "OING_CLIPPER_SAVE_ABORT";
  const BRIDGE_PING_TYPE = "OING_CLIPPER_PING_REQ";
  const BRIDGE_TIMEOUT_MS = 8000;
  const MIN_TERM_LEN = 2;
  const DEFAULT_BRIDGE_ORIGIN = "https://www.oingapp.com";
  const ALLOWED_BRIDGE_HOSTS = new Set([
    "oingapp.com",
    "www.oingapp.com",
    "localhost",
    "127.0.0.1"
  ]);
  const IS_E2E_FIXTURE_PAGE = /^\/clipper\/extension-fixture\/?$/.test(location.pathname);

  let button = null;
  let toastEl = null;
  let toastTimer = null;
  let isClickingClipperButton = false;

  if (IS_E2E_FIXTURE_PAGE) {
    try {
      document.documentElement?.setAttribute(INJECTED_DATA_ATTR, "1");
    } catch {
      // no-op
    }

    try {
      console.log(JSON.stringify({ tag: "CLIPPER_E2E", step: "content_injected", ts: Date.now() }));
    } catch {
      // no-op
    }
  }

  function logClipper(step, extra = {}) {
    try {
      console.log(JSON.stringify({ tag: "CLIPPER_E2E", step, ts: Date.now(), ...extra }));
    } catch {
      // no-op
    }
  }

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

  function createOrUpdateToast(message, tone) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "englishapp-clipper-toast";
      toastEl.setAttribute(TOAST_DATA_ATTR, "toast");
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.setAttribute(TOAST_UPDATED_AT_ATTR, String(Date.now()));
    toastEl.classList.remove("is-success", "is-warn", "is-error", "is-visible");
    toastEl.classList.add(`is-${tone}`, "is-visible");
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastTimer = setTimeout(() => {
      if (!toastEl) return;
      toastEl.classList.remove("is-visible");
    }, 1600);
  }

  function showSaveResultToast(result) {
    const statusCode = Number(result?.statusCode || 0);
    const clipperStatus = result?.result?.status || result?.status;

    if (clipperStatus === "duplicate") {
      createOrUpdateToast("이미 단어장에 있는 단어입니다.", "warn");
      return;
    }

    if (result?.ok && clipperStatus === "created") {
      createOrUpdateToast("단어장에 저장되었습니다.", "success");
      return;
    }

    if (statusCode === 401 || statusCode === 403) {
      createOrUpdateToast("저장 실패: 로그인이 필요합니다.", "warn");
      return;
    }
    if (statusCode === 422) {
      createOrUpdateToast("지정된 단어장이 없습니다. 단어장을 지정해 주세요", "error");
      return;
    }
    if (result?.errorCode === "timeout") {
      createOrUpdateToast("저장 실패: 시간 초과입니다. 다시 시도해 주세요.", "error");
      return;
    }
    createOrUpdateToast("저장 실패: 네트워크 또는 서버 오류입니다.", "error");
  }

  function injectPageBridgeScript() {
    return new Promise((resolve) => {
      try {
        const pingBridge = () => new Promise((pingResolve) => {
          const pingOnce = () => new Promise((resolveOnce) => {
            const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const channel = new MessageChannel();
            const timeout = setTimeout(() => {
              try {
                channel.port1.close();
              } catch {
                // no-op
              }
              resolveOnce(false);
            }, 1200);
            channel.port1.onmessage = (event) => {
              const data = event.data || {};
              if (data.requestId !== requestId) return;
              clearTimeout(timeout);
              try {
                channel.port1.close();
              } catch {
                // no-op
              }
              resolveOnce(Boolean(data.ok));
            };
            channel.port1.start();
            window.postMessage(
              { type: BRIDGE_PING_TYPE, requestId },
              window.location.origin,
              [channel.port2]
            );
          });

          void pingOnce().then((ok) => {
            if (ok) {
              pingResolve(true);
              return;
            }
            setTimeout(() => {
              void pingOnce().then(pingResolve);
            }, 150);
          });
        });

        const script = document.createElement("script");
        script.dataset.oingClipperBridge = "1";
        script.src = chrome.runtime.getURL("page-bridge.js");
        script.onload = () => {
          script.remove();
          void pingBridge().then(resolve);
        };
        script.onerror = () => {
          script.remove();
          resolve(false);
        };
        (document.documentElement || document.head || document.body).appendChild(script);
      } catch {
        resolve(false);
      }
    });
  }

  function requestClipperSaveViaPage(payload) {
    return new Promise((resolve) => {
      const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const channel = new MessageChannel();
      const timeout = setTimeout(() => {
        window.postMessage(
          {
            type: BRIDGE_ABORT_TYPE,
            requestId
          },
          window.location.origin
        );
        try {
          channel.port1.close();
        } catch {
          // no-op
        }
        resolve({ ok: false, statusCode: 0, errorCode: "timeout" });
      }, BRIDGE_TIMEOUT_MS);

      channel.port1.onmessage = (event) => {
        const data = event.data || {};
        if (data.requestId !== requestId) return;
        clearTimeout(timeout);
        try {
          channel.port1.close();
        } catch {
          // no-op
        }
        resolve(data);
      };
      channel.port1.start();

      window.postMessage(
        {
          type: BRIDGE_REQ_TYPE,
          requestId,
          payload
        },
        window.location.origin,
        [channel.port2]
      );
    });
  }

  function shouldUseLegacyBridgeFallback() {
    try {
      return window.localStorage.getItem("oing-clipper-legacy-fallback") === "1";
    } catch {
      return false;
    }
  }

  function resolveBridgeOrigin(callback) {
    const sanitizeBridgeOrigin = (candidate) => {
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
    };

    chrome.storage.sync.get(["bridgeOrigin"], (storage) => {
      const configured = typeof storage.bridgeOrigin === "string" && storage.bridgeOrigin.startsWith("http")
        ? sanitizeBridgeOrigin(storage.bridgeOrigin)
        : null;
      const runtime = sanitizeBridgeOrigin(window.location.origin);
      const fallback = sanitizeBridgeOrigin(DEFAULT_BRIDGE_ORIGIN) || DEFAULT_BRIDGE_ORIGIN;
      callback(configured || runtime || fallback);
    });
  }

  function shouldAutoLegacyFallback(result) {
    const statusCode = Number(result?.statusCode || 0);
    return result?.errorCode === "timeout" || result?.errorCode === "network_error" || statusCode >= 500;
  }

  function triggerLegacyFallback(payload, reason, extra = {}) {
    logClipper("legacy_fallback_triggered", { reason, ...extra });
    createOrUpdateToast("문제가 발생해 저장 화면으로 이동합니다…", "warn");
    openBridgeInPage(payload);
  }

  function isClipperButtonTarget(target) {
    return target instanceof Element && Boolean(target.closest(`[${BUTTON_DATA_ATTR}="button"]`));
  }

  function releaseClipperClickGuard() {
    setTimeout(() => {
      isClickingClipperButton = false;
    }, 0);
  }

  function openBridgeInPage(payload) {
    const markOpened = (via) => {
      window.__CLIPPER_BRIDGE_OPENED__ = { via, ts: Date.now() };
    };

    const placeholderWindow = window.open("about:blank", "_blank", "noreferrer");

    const openBridgeUrl = (url, via) => {
      if (placeholderWindow && !placeholderWindow.closed) {
        try {
          placeholderWindow.location.href = url;
          markOpened(`${via}.placeholder`);
          logClipper("fallback_open_bridge_success", { via: `${via}.placeholder` });
          return;
        } catch {
          // continue to window.open fallback
        }
      }

      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (opened) {
        markOpened(via);
        logClipper("fallback_open_bridge_success", { via });
        return;
      }
      logClipper("fallback_open_bridge_blocked", { via: "window.open" });
      const shouldReplace = window.confirm("새 창 열기에 실패했습니다. 현재 페이지로 이동할까요?");
      if (!shouldReplace) return;
      markOpened("location.assign");
      logClipper("fallback_open_bridge_replace_confirmed", { via: "location.assign" });
      location.assign(url);
    };

    chrome.runtime.sendMessage({ type: "openClipperBridge", payload }, (response) => {
      if (!chrome.runtime.lastError && response?.ok && response.mode === "openWindow") {
        if (placeholderWindow && !placeholderWindow.closed) {
          try {
            placeholderWindow.close();
          } catch {
            // no-op
          }
        }
        markOpened("background.openWindow");
        logClipper("fallback_open_bridge_success", { via: "background.openWindow" });
        return;
      }

      if (!chrome.runtime.lastError && typeof response?.url === "string") {
        try {
          const parsed = new URL(response.url);
          const isAllowedHost = ALLOWED_BRIDGE_HOSTS.has(parsed.hostname);
          const isHttps = parsed.protocol === "https:";
          const isLocalHttp = parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
          if (isAllowedHost && (isHttps || isLocalHttp)) {
            openBridgeUrl(parsed.toString(), "background.delegate");
            return;
          }
        } catch {
          // fall through to local bridge origin resolution
        }
      }

      resolveBridgeOrigin((bridgeOrigin) => {
        const encoded = base64UrlEncodeUtf8(JSON.stringify(payload));
        const url = `${bridgeOrigin.replace(/\/$/, "")}/clipper/add?payload=${encodeURIComponent(encoded)}`;
        logClipper("fallback_open_bridge_attempt", {
          bridgeOrigin: bridgeOrigin.replace(/\/$/, ""),
          targetPath: "/clipper/add"
        });
        openBridgeUrl(url, "window.open");
        return;
      });
    });
  }

  function createButton(x, y, onClick) {
    removeButton();
    button = document.createElement("button");
    button.id = BUTTON_ID;
    button.setAttribute(BUTTON_DATA_ATTR, "button");
    button.type = "button";
    button.textContent = "단어장에 추가";
    button.className = "englishapp-clipper-btn";
    button.style.left = `${x}px`;
    button.style.top = `${y}px`;
    button.addEventListener("pointerdown", () => {
      isClickingClipperButton = true;
    }, { capture: true });
    button.addEventListener("pointerup", releaseClipperClickGuard, { capture: true });
    button.addEventListener("pointercancel", releaseClipperClickGuard, { capture: true });
    button.addEventListener("mousedown", (e) => e.preventDefault());
    button.addEventListener("click", onClick);
    document.body.appendChild(button);
  }

  function onMouseUp(event) {
    if (isClickingClipperButton && event.buttons === 0 && !isClipperButtonTarget(event.target)) {
      isClickingClipperButton = false;
    }
    if (isClickingClipperButton || isClipperButtonTarget(event.target)) {
      return;
    }

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

    createButton(rect.right + window.scrollX + 8, rect.top + window.scrollY - 4, (event) => {
      try {
        const clickEvent = event;
        if (IS_E2E_FIXTURE_PAGE) {
          try {
            document.documentElement?.setAttribute(CLICKED_DATA_ATTR, String(Date.now()));
          } catch {
            // no-op
          }
        }
        logClipper("button_click_handler_entered", {
          isTrusted: clickEvent?.isTrusted ?? null,
          button: clickEvent?.button ?? null,
          clientX: clickEvent?.clientX ?? null,
          clientY: clickEvent?.clientY ?? null
        });
        const payload = {
          term,
          exampleSentenceEn,
          sourceUrl: location.protocol === "file:" ? undefined : location.href,
          sourceTitle: document.title
        };
        resolveBridgeOrigin((bridgeOrigin) => {
          let sameOrigin = false;
          try {
            sameOrigin = new URL(bridgeOrigin).origin === window.location.origin;
          } catch {
            sameOrigin = false;
          }

          if (!sameOrigin) {
            triggerLegacyFallback(payload, "cross_origin_context", { bridgeOrigin });
            return;
          }

          void injectPageBridgeScript().then((bridgeReady) => {
            if (!bridgeReady) {
              logClipper("save_bridge_injection_failed");
              triggerLegacyFallback(payload, "bridge_injection_failed");
              return;
            }

            logClipper("save_request_start", { termLength: term.length });
            void requestClipperSaveViaPage(payload).then((result) => {
              logClipper("save_request_done", {
                ok: Boolean(result?.ok),
                statusCode: Number(result?.statusCode || 0),
                resultStatus: result?.result?.status || result?.status || null,
                errorCode: result?.errorCode || null
              });
              showSaveResultToast(result);
              const autoLegacyFallback = shouldAutoLegacyFallback(result);
              const forcedLegacyFallback = shouldUseLegacyBridgeFallback();
              if (!result?.ok && (autoLegacyFallback || forcedLegacyFallback)) {
                const reason = forcedLegacyFallback && !autoLegacyFallback
                  ? "manual_legacy_fallback"
                  : (result?.errorCode || `status_${result?.statusCode || 0}`);
                triggerLegacyFallback(payload, reason);
              }
            });
          });
        });
        removeButton();
        selection.removeAllRanges();
      } finally {
        releaseClipperClickGuard();
      }
    });
  }

  document.addEventListener("pointerup", releaseClipperClickGuard, true);
  document.addEventListener("pointercancel", releaseClipperClickGuard, true);
  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("scroll", removeButton, true);
  document.addEventListener("mousedown", (event) => {
    if (button && !isClipperButtonTarget(event.target)) {
      removeButton();
    }
  });
})();
