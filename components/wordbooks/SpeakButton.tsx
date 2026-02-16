"use client";

import { useState } from "react";

type Props = {
  text: string;
  lang?: string; // e.g. "en-US"
  iconOnly?: boolean;
  className?: string;
};

export function SpeakButton({ text, lang, iconOnly = false, className = "" }: Props) {
  const [error, setError] = useState<string>("");

  const onSpeak = () => {
    setError("");
    try {
      if (typeof window === "undefined") return;
      if (!("speechSynthesis" in window)) {
        setError("Speech synthesis not supported.");
        return;
      }
      const trimmed = text.trim();
      if (!trimmed) return;
      const u = new SpeechSynthesisUtterance(trimmed);
      if (lang) u.lang = lang;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speak failed.");
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onSpeak}
        className={[
          "rounded-lg border border-slate-200 bg-white text-xs font-semibold hover:bg-slate-50",
          iconOnly ? "inline-flex h-7 w-7 items-center justify-center p-0" : "px-2.5 py-1",
          className
        ].join(" ")}
        aria-label="Speak"
      >
        {iconOnly ? (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-2">
            <path d="M4 10v4h4l5 4V6L8 10H4z" />
            <path d="M16 9a5 5 0 0 1 0 6" />
            <path d="M18.5 6.5a8.5 8.5 0 0 1 0 11" />
          </svg>
        ) : (
          "Speak"
        )}
      </button>
      {error ? <span className="text-xs text-rose-700">{error}</span> : null}
    </div>
  );
}
