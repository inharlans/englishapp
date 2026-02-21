"use client";

import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const pageByNumber: Record<string, Route> = {
  "1": "/",
  "2": "/memorize",
  "3": "/quiz-meaning",
  "4": "/quiz-word",
  "5": "/list-correct",
  "6": "/list-wrong",
  "7": "/list-half"
};

const legacyStudyPaths = new Set<string>([
  "/memorize",
  "/quiz-meaning",
  "/quiz-word",
  "/list-correct",
  "/list-wrong",
  "/list-half"
]);

function isWordbookStudyPath(pathname: string): boolean {
  return /^\/wordbooks\/\d+\/(memorize|quiz-meaning|quiz-word|list-correct|list-wrong|list-half)$/.test(pathname);
}

export function KeyboardPageNavigator() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const shortcutEnabled = legacyStudyPaths.has(pathname) || isWordbookStudyPath(pathname);
    if (!shortcutEnabled) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      // Don't steal number keys while the user is typing in a form field.
      const active = document.activeElement as HTMLElement | null;
      const tagName = active?.tagName;
      if (
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        tagName === "BUTTON" ||
        active?.isContentEditable
      ) {
        return;
      }

      // Also ignore if the event originated from within an editable element.
      const targetEl = event.target instanceof HTMLElement ? event.target : null;
      if (
        targetEl?.closest("input, textarea, select, button, [contenteditable='true']")
      ) {
        return;
      }

      const target = pageByNumber[event.key];
      if (target && target !== pathname) {
        event.preventDefault();
        router.push(target);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [pathname, router]);

  return null;
}
