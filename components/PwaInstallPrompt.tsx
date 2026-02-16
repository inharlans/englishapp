"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">Install this app for faster offline study.</p>
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
            Install
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-blue-100"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}


