(() => {
  if (window.__OING_CLIPPER_BRIDGE_INSTALLED__) return;
  window.__OING_CLIPPER_BRIDGE_INSTALLED__ = true;
  document.documentElement?.setAttribute("data-oing-clipper-bridge-installed", "1");

  const REQ = "OING_CLIPPER_SAVE_REQ";
  const ABORT = "OING_CLIPPER_SAVE_ABORT";
  const PING = "OING_CLIPPER_PING_REQ";
  const inflight = new Map();

  function readCookie(name) {
    const pair = document.cookie
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${name}=`));
    if (!pair) return "";
    const raw = pair.slice(name.length + 1);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const data = event.data || {};
    if (data.type === ABORT && data.requestId) {
      const requestId = String(data.requestId);
      const controller = inflight.get(requestId);
      if (controller) {
        controller.abort();
        inflight.delete(requestId);
      }
      return;
    }
    if (data.type === PING && data.requestId) {
      const pingPort = event.ports && event.ports[0] ? event.ports[0] : null;
      if (!pingPort) return;
      try {
        pingPort.postMessage({ requestId: String(data.requestId), ok: true });
      } catch {
        // no-op
      } finally {
        try {
          pingPort.close();
        } catch {
          // no-op
        }
      }
      return;
    }
    if (data.type !== REQ || !data.requestId) return;
    const port = event.ports && event.ports[0] ? event.ports[0] : null;
    if (!port) return;

    const requestId = String(data.requestId);
    const payload = data.payload || {};
    const controller = new AbortController();
    inflight.set(requestId, controller);

    try {
      const csrf = readCookie("csrf_token");
      const headers = { "content-type": "application/json" };
      if (csrf) headers["x-csrf-token"] = csrf;
      const response = await fetch("/api/clipper/add", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      let json = null;
      try {
        json = await response.json();
      } catch {
        json = null;
      }

      port.postMessage({
        requestId,
        ok: response.ok,
        statusCode: response.status,
        result: json
      });
    } catch (error) {
      const errorCode = error instanceof DOMException && error.name === "AbortError"
        ? "aborted"
        : "network_error";
      try {
        port.postMessage({
          requestId,
          ok: false,
          statusCode: 0,
          errorCode,
          errorMessage: error instanceof Error ? error.message : String(error)
        });
      } catch {
        // no-op
      }
    } finally {
      inflight.delete(requestId);
      try {
        port.close();
      } catch {
        // no-op
      }
    }
  });
})();
