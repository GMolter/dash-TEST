import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync('public/sw.js', 'utf8');
function worker(cached?: Response) {
  const handlers: Record<string, (event: unknown) => void> = {};
  const cache = { match: vi.fn().mockResolvedValue(cached), put: vi.fn(), delete: vi.fn(), keys: vi.fn().mockResolvedValue([]) };
  const fetch = vi.fn();
  const caches = { open: vi.fn().mockResolvedValue(cache), keys: vi.fn().mockResolvedValue(['olio-workstation-runtime-v1', 'unrelated']), delete: vi.fn() };
  runInNewContext(source, { self: { location: { origin: 'https://olio.one' }, addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; }, clients: { claim: vi.fn() } }, caches, fetch, URL, Response });
  const request = async (destination: string, mode = 'cors') => {
    let response: Promise<Response> | undefined;
    handlers.fetch({ request: { method: 'GET', url: 'https://olio.one/assets/app.js', mode, destination }, respondWith: (value: Promise<Response>) => { response = value; } });
    return response!;
  };
  return { cache, fetch, caches, handlers, request };
}

describe('Deployment cache recovery', () => {
  it('loads fresh HTML instead of a stale cached shell', async () => {
    const w = worker(new Response('old shell', { headers: { 'content-type': 'text/html' } }));
    w.fetch.mockResolvedValue(new Response('new shell', { headers: { 'content-type': 'text/html' } }));
    expect(await (await w.request('document', 'navigate')).text()).toBe('new shell');
    expect(w.cache.put).toHaveBeenCalled();
  });
  it('retains the cached shell when offline', async () => {
    const w = worker(new Response('offline shell'));
    w.fetch.mockRejectedValue(new Error('offline'));
    expect(await (await w.request('document', 'navigate')).text()).toBe('offline shell');
  });
  it('evicts HTML cached under a JavaScript URL', async () => {
    const w = worker(new Response('<html>fallback</html>', { headers: { 'content-type': 'text/html' } }));
    w.fetch.mockResolvedValue(new Response('valid script', { headers: { 'content-type': 'application/javascript' } }));
    expect(await (await w.request('script')).text()).toBe('valid script');
    expect(w.cache.delete).toHaveBeenCalled();
  });
  it('never caches a rewrite fallback as JavaScript', async () => {
    const w = worker();
    w.fetch.mockResolvedValue(new Response('<html>fallback</html>', { headers: { 'content-type': 'text/html' } }));
    await w.request('script');
    expect(w.cache.put).not.toHaveBeenCalled();
  });
  it('removes old Olio caches on activation and preserves other caches', async () => {
    const w = worker();
    let done: Promise<void> | undefined;
    w.handlers.activate({ waitUntil: (value: Promise<void>) => { done = value; } });
    await done;
    expect(w.caches.delete).toHaveBeenCalledExactlyOnceWith('olio-workstation-runtime-v1');
  });
});
