const CACHE_NAME = 'olio-workstation-runtime-v2';
const APP_SHELL = '/';
const MAX_CACHE_ENTRIES = 80;

// Browser storage is optional. A cache failure must never discard a working
// network response or prevent the application bundle from loading.
async function openCache() {
  try { return await caches.open(CACHE_NAME); } catch { return null; }
}

async function cacheResponse(cache, key, response) {
  try { await cache?.put(key, response.clone()); } catch { /* Network response remains usable. */ }
}

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
      .catch(() => {})
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
      .catch(() => {})
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
      openCache().then(async (cache) => {
        try {
          const response = await fetch(request, { cache: 'no-cache' });
          if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
            await cacheResponse(cache, APP_SHELL, response);
          }
          return response;
        } catch {
          try { return (await cache?.match(APP_SHELL)) || Response.error(); }
          catch { return Response.error(); }
        }
      }),
    );
    return;
  }

  if (!['script', 'style', 'font', 'image'].includes(request.destination)) return;

  event.respondWith(
    openCache().then(async (cache) => {
      let cached;
      try { cached = await cache?.match(request); } catch { /* Fetch below. */ }
      const validAsset = (response) => {
        if (!response.ok) return false;
        const type = response.headers.get('content-type') || '';
        if (request.destination === 'script') return /(?:java|ecma)script/i.test(type);
        if (request.destination === 'style') return type.includes('text/css');
        return !type.includes('text/html');
      };
      if (cached && validAsset(cached)) return cached;
      if (cached) {
        try { await cache?.delete(request); } catch { /* Fetch below. */ }
      }

      const response = await fetch(request);
      if (validAsset(response)) {
        await cacheResponse(cache, request, response);
        if (cache) void trimCache(cache).catch(() => {});
      }
      return response;
    }),
  );
});
