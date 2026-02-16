"use client";

import { getCsrfCookieName, getCsrfHeaderName } from "@/lib/csrf";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const needle = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(needle)) {
      return decodeURIComponent(trimmed.slice(needle.length));
    }
  }
  return null;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers ?? {});
  const token = readCookie(getCsrfCookieName());
  if (token && !headers.has(getCsrfHeaderName())) {
    headers.set(getCsrfHeaderName(), token);
  }
  return fetch(input, {
    ...init,
    headers
  });
}

