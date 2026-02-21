"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "pwa_install_prompt_dismissed_until";
const DISMISS_DAYS = 7;
const STUDY_PATH_RE =
  /^\/wordbooks\/\d+\/(memorize|cards|quiz|quiz-meaning|quiz-word|list-correct|list-wrong|list-half)(\/|$)/;
const SUPPRESSED_PATHS = new Set([
  "/login",
  "/logout",
  "/pricing",
  "/terms",
  "/privacy",
  "/admin"
]);

function isSuppressedPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (SUPPRESSED_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/admin/")) return true;
  return false;
}

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DISMISS_KEY);
      if (!raw) return;
      const dismissedUntil = Number(raw);
      if (Number.isFinite(dismissedUntil) && dismissedUntil > Date.now()) {
        setDismissed(true);
      }
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (pathname && (STUDY_PATH_RE.test(pathname) || isSuppressedPath(pathname))) return null;
  if (!deferred || dismissed) return null;

  return (
    <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900" role="status" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">오프라인 학습을 더 빠르게 하려면 앱을 설치하세요.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              await deferred.prompt();
              await deferred.userChoice.catch(() => null);
              setDeferred(null);
            }}
            className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600"
          >
            설치
          </button>
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              try {
                const dismissedUntil = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
                window.localStorage.setItem(DISMISS_KEY, String(dismissedUntil));
              } catch {
                // localStorage unavailable: keep in-memory dismissal only.
              }
            }}
            className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-blue-100"
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  );
}
