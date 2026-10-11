const CACHE_NAME = "market-brief-shell-v2";
const SHELL_ASSETS = ["/", "/manifest.webmanifest", "/briefmark.svg", "/icon-180.png", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request).catch(() => new Response(JSON.stringify({ error: "Offline" }), { status: 503, headers: { "Content-Type": "application/json" } })));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && (event.request.mode === "navigate" || url.pathname.startsWith("/_next/static/") || SHELL_ASSETS.includes(url.pathname))) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(async (cached) => cached || (event.request.mode === "navigate" ? await caches.match("/") : null) || Response.error()))
  );
});
