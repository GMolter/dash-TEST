import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)![1];

function startup() {
  document.body.innerHTML = html.match(/<body>([\s\S]*?)<script>/)![1];
  const listeners: Record<string, (event?: unknown) => void> = {};
  let retry: () => Promise<void> = async () => {};
  document.getElementById('olio-startup-retry')!.addEventListener = vi.fn((_, callback) => {
    retry = callback as unknown as () => Promise<void>;
  });
  const reload = vi.fn();
  const own = { active: { scriptURL: 'https://olio.one/sw.js' }, unregister: vi.fn() };
  const other = { active: { scriptURL: 'https://olio.one/other/sw.js' }, unregister: vi.fn() };
  const caches = { keys: vi.fn().mockResolvedValue(['olio-workstation-runtime-v2', 'other']), delete: vi.fn() };
  const serviceWorker = {
    controller: null,
    addEventListener: vi.fn(),
    getRegistrations: vi.fn().mockResolvedValue([own, other]),
    register: vi.fn().mockResolvedValue({ update: vi.fn() }),
  };
  const setTimeout = vi.fn();
  const location = { href: 'https://olio.one/', hostname: 'olio.one', reload };
  runInNewContext(source, {
    document, location, URL, caches, setTimeout,
    navigator: { serviceWorker },
    window: { location, caches, setTimeout, addEventListener: (name: string, callback: (event?: unknown) => void) => { listeners[name] = callback; } },
  });
  return { listeners, retry: () => retry(), reload, own, other, caches };
}

describe('Startup recovery', () => {
  it('shows the first startup error as text for diagnosis', () => {
    const s = startup();
    s.listeners.error({ message: 'Missing Supabase environment variables' });
    s.listeners.error({ message: 'Later error' });
    expect(document.getElementById('olio-startup-error')!.textContent).toBe('Missing Supabase environment variables');
    expect(document.getElementById('olio-startup-details')!.hidden).toBe(false);
  });
  it('clears only Olio caches and unregisters only its service worker before reloading', async () => {
    const s = startup();
    await s.retry();
    expect(s.caches.delete).toHaveBeenCalledExactlyOnceWith('olio-workstation-runtime-v2');
    expect(s.own.unregister).toHaveBeenCalledOnce();
    expect(s.other.unregister).not.toHaveBeenCalled();
    expect(s.reload).toHaveBeenCalledOnce();
  });
  it('still reloads when browser storage rejects cleanup', async () => {
    const s = startup();
    s.caches.keys.mockRejectedValue(new Error('Storage unavailable'));
    await s.retry();
    expect(s.reload).toHaveBeenCalledOnce();
  });
});
