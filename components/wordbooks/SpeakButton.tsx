"use client";

import { useState } from "react";

type Props = {
  text: string;
  lang?: string; // e.g. "en-US"
};

export function SpeakButton({ text, lang }: Props) {
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
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold hover:bg-slate-50"
        aria-label="Speak"
      >
        Speak
      </button>
      {error ? <span className="text-xs text-rose-700">{error}</span> : null}
    </div>
  );
}

