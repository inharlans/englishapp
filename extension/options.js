const DEFAULT_BRIDGE_ORIGIN = "https://www.oingapp.com";

function normalizeOrigin(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (url.origin === "null") return "";
    return url.origin;
  } catch {
    return "";
  }
}

function setStatus(message, isError = false) {
  const status = document.getElementById("status");
  status.textContent = message;
  status.style.color = isError ? "#b91c1c" : "#0f766e";
}

function loadSettings() {
  chrome.storage.sync.get(["bridgeOrigin"], (storage) => {
    if (chrome.runtime.lastError) {
      setStatus("설정을 불러오지 못했습니다.", true);
      return;
    }
    const value = typeof storage.bridgeOrigin === "string" ? storage.bridgeOrigin : DEFAULT_BRIDGE_ORIGIN;
    const input = document.getElementById("bridgeOrigin");
    input.value = value;
  });
}

function saveSettings() {
  const input = document.getElementById("bridgeOrigin");
  const normalized = normalizeOrigin(input.value);
  if (!normalized) {
    setStatus("유효한 URL을 입력해 주세요.", true);
    return;
  }
  chrome.storage.sync.set({ bridgeOrigin: normalized }, () => {
    if (chrome.runtime.lastError) {
      setStatus("저장에 실패했습니다.", true);
      return;
    }
    setStatus("저장되었습니다.");
  });
}

function resetSettings() {
  chrome.storage.sync.set({ bridgeOrigin: DEFAULT_BRIDGE_ORIGIN }, () => {
    if (chrome.runtime.lastError) {
      setStatus("초기화에 실패했습니다.", true);
      return;
    }
    const input = document.getElementById("bridgeOrigin");
    input.value = DEFAULT_BRIDGE_ORIGIN;
    setStatus("기본값으로 복원했습니다.");
  });
}

document.getElementById("saveBtn").addEventListener("click", saveSettings);
document.getElementById("resetBtn").addEventListener("click", resetSettings);

loadSettings();
