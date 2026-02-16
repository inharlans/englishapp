/* eslint-disable no-restricted-globals */

const CACHE_NAME = "englishapp-cache-v2";
const CORE = [
  "/offline",
  "/wordbooks",
  "/wordbooks/market",
  "/memorize",
  "/quiz-meaning",
  "/quiz-word"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) {
    cache.put(request, res.clone());
  }
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((res) => {
      if (res && res.ok) {
        cache.put(request, res.clone());
      }
      return res;
    })
    .catch(() => null);

  if (cached) {
    fetchPromise.catch(() => null);
    return cached;
  }

  const fresh = await fetchPromise;
  if (fresh) return fresh;

  return new Response("Offline", {
    status: 503,
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      cache.put(request, res.clone());
    }
    return res;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match("/offline");
    return (
      offline ||
      new Response("Offline", {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" }
      })
    );
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req));
    return;
  }

  if (url.pathname.startsWith("/api/wordbooks/market") || url.pathname.startsWith("/api/wordbooks/downloaded")) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      networkFirst(req).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (
          (await cache.match(url.pathname)) ||
          (await cache.match("/offline")) ||
          new Response("Offline", {
            status: 503,
            headers: { "content-type": "text/plain; charset=utf-8" }
          })
        );
      })
    );
    return;
  }
});
