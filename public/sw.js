const CACHE = "iron-log-v1";
const SHELL = ["/", "/index.html"];

// Install — cache the app shell
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL))
  );
  self.skipWaiting();
});

// Activate — clear old caches
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network first, fall back to cache
self.addEventListener("fetch", e => {
  // Don't intercept API calls — always need fresh data
  if (e.request.url.includes("/api/")) return;
  if (e.request.method !== "GET") return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache successful responses for the app shell
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
