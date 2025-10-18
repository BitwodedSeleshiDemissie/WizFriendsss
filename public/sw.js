const CACHE_NAME = "myproject-cache-v1";
const OFFLINE_URL = "/offline.html";
const PREFETCH_ASSETS = [OFFLINE_URL, "/manifest.webmanifest"];

const isSameOrigin = (request) => new URL(request.url).origin === self.location.origin;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        await cache.addAll(PREFETCH_ASSETS);
      } catch (error) {
        console.warn("SW prefetch failed; continuing without full cache.", error);
      }
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          if (isSameOrigin(request)) {
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, copy))
              .catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached ?? (await caches.match(OFFLINE_URL));
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            if (isSameOrigin(request)) {
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, copy))
                .catch(() => {});
            }
          }
          return response;
        })
        .catch(() => cached);

      return cached ?? networkFetch;
    })
  );
});
