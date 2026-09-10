const CACHE_NAME = 'olio-workstation-runtime-v2';
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
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const response = await fetch(request, { cache: 'no-cache' });
          if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
            await cache.put(APP_SHELL, response.clone());
          }
          return response;
        } catch {
          return (await cache.match(APP_SHELL)) || Response.error();
        }
      }),
    );
    return;
  }

  if (!['script', 'style', 'font', 'image'].includes(request.destination)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const validAsset = (response) => {
        if (!response.ok) return false;
        const type = response.headers.get('content-type') || '';
        if (request.destination === 'script') return /(?:java|ecma)script/i.test(type);
        if (request.destination === 'style') return type.includes('text/css');
        return !type.includes('text/html');
      };
      if (cached && validAsset(cached)) return cached;
      if (cached) await cache.delete(request);

      const response = await fetch(request);
      if (validAsset(response)) {
        await cache.put(request, response.clone());
        void trimCache(cache);
      }
      return response;
    }),
  );
});
