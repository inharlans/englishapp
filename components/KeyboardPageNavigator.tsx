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

export function KeyboardPageNavigator() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
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
