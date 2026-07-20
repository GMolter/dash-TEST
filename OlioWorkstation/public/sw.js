const CACHE_NAME = 'olio-workstation-runtime-v1';
const APP_SHELL = '/';
const MAX_CACHE_ENTRIES = 80;

async function trimCache(cache) {
  const keys = await cache.keys();
  const excess = keys.length - MAX_CACHE_ENTRIES;
  if (excess <= 0) return;
  await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('olio-workstation-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    const cachePromise = caches.open(CACHE_NAME);
    const cachedPromise = cachePromise.then((cache) => cache.match(APP_SHELL));
    const updatePromise = Promise.all([cachePromise, cachedPromise])
      .then(async ([cache, cached]) => {
        try {
          const response = await fetch(request);
          if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
            await cache.put(APP_SHELL, response.clone());
          }
          return response;
        } catch {
          return cached;
        }
      });

    event.waitUntil(updatePromise.then(() => undefined));
    event.respondWith(
      cachedPromise.then((cached) => cached || updatePromise),
    );
    return;
  }

  if (!['script', 'style', 'font', 'image'].includes(request.destination)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok) {
        await cache.put(request, response.clone());
        void trimCache(cache);
      }
      return response;
    }),
  );
});
