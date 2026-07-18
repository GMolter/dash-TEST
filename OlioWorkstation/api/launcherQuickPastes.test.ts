import type { VercelRequest, VercelResponse } from '@vercel/node';
import { describe, expect, it, vi } from 'vitest';
import {
  handleQuickPastes,
  LAUNCHER_QUICK_PASTE_LIMITS,
  validateLauncherQuickPasteItems,
} from './launcher.js';

const deviceId = 'aaaaaaaa-0000-4000-8000-000000000001';
const credential = 'a'.repeat(64);

function item(overrides: Record<string, unknown> = {}) {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    title: 'Synthetic title',
    content: 'Synthetic content',
    category: 'General',
    sort_order: 0,
    is_favorite: false,
    ...overrides,
  };
}

function request(body: Record<string, unknown> = {}) {
  return {
    body: { action: 'quick-pastes', device_id: deviceId, credential, ...body },
    headers: { 'x-forwarded-for': '127.0.0.1' },
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as VercelRequest;
}

function response() {
  const result = {
    statusCode: 0,
    body: {} as Record<string, unknown>,
    headers: new Map<string, unknown>(),
    setHeader: vi.fn((name: string, value: unknown) => {
      result.headers.set(name, value);
      return result;
    }),
    status: vi.fn((statusCode: number) => {
      result.statusCode = statusCode;
      return result;
    }),
    json: vi.fn((body: Record<string, unknown>) => {
      result.body = body;
      return result;
    }),
  };
  return result as unknown as VercelResponse & typeof result;
}

function clientWith(data: unknown, error: unknown = null) {
  return {
    rpc: vi.fn(async () => ({ data, error })),
    auth: { getUser: vi.fn() },
  };
}

function connected(items: unknown[]) {
  return [{
    outcome: 'connected',
    synchronized_at: '2026-07-17T12:34:56.000Z',
    quick_paste_items: items,
  }];
}

describe('launcher Quick Paste device endpoint', () => {
  it('returns only the bounded launcher read model in stable order', async () => {
    const rows = [
      item(),
      item({
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
        title: '<script>literal</script>',
        content: '<b>untrusted text</b>',
        category: 'Support',
        sort_order: 1,
        is_favorite: true,
      }),
    ];
    const client = clientWith(connected(rows));
    const res = response();

    await handleQuickPastes(request({ user_id: 'spoof', owner_id: 'spoof' }), res, client as never, 'server-key');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      state: 'connected',
      synchronized_at: '2026-07-17T12:34:56.000Z',
      items: rows,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/user_id|owner_id|email|credential_hash|created_at|updated_at/);
    expect(client.rpc).toHaveBeenCalledWith('fetch_launcher_quick_pastes', expect.objectContaining({
      p_device_identifier: deviceId,
      p_credential_hash: expect.stringMatching(/^\\x[0-9a-f]{64}$/),
      p_source_actor_hash: expect.stringMatching(/^\\x[0-9a-f]{64}$/),
      p_device_actor_hash: expect.stringMatching(/^\\x[0-9a-f]{64}$/),
    }));
    expect(JSON.stringify(client.rpc.mock.calls)).not.toMatch(/user_id|owner_id|email|spoof/);
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });

  it('returns a safe empty collection', async () => {
    const res = response();
    await handleQuickPastes(request(), res, clientWith(connected([])) as never, 'server-key');
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ state: 'connected', items: [] });
  });

  it('rejects malformed and oversized records without returning content', async () => {
    expect(validateLauncherQuickPasteItems([item({ sort_order: -1 })])).toBeNull();
    expect(validateLauncherQuickPasteItems([item({ content: 'x'.repeat(20_001) })])).toBeNull();
    expect(validateLauncherQuickPasteItems(
      Array.from({ length: LAUNCHER_QUICK_PASTE_LIMITS.items + 1 }, (_, index) =>
        item({ id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(index).padStart(12, '0')}`, sort_order: index })),
    )).toBeNull();

    const malformedRes = response();
    await handleQuickPastes(
      request(),
      malformedRes,
      clientWith(connected([item({ is_favorite: 'yes' })])) as never,
      'server-key',
    );
    expect(malformedRes.statusCode).toBe(502);
    expect(malformedRes.body).toEqual({ state: 'invalid' });

    const unicodeRows = Array.from({ length: 25 }, (_, index) => item({
      id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(index + 1).padStart(12, '0')}`,
      title: `Synthetic ${index + 1}`,
      content: '😀'.repeat(20_000),
      sort_order: index,
    }));
    const oversizedRes = response();
    await handleQuickPastes(
      request(),
      oversizedRes,
      clientWith(connected(unicodeRows)) as never,
      'server-key',
    );
    expect(oversizedRes.statusCode).toBe(413);
    expect(oversizedRes.body).toEqual({ state: 'too_large' });
  });

  it.each([
    ['wrong credential', { outcome: 'invalid' }, 401, 'invalid'],
    ['wrong device', { outcome: 'invalid' }, 401, 'invalid'],
    ['revoked device', { outcome: 'invalid' }, 401, 'invalid'],
    ['legacy scope', { outcome: 'scope_required' }, 403, 'scope_required'],
    ['rate limit', { outcome: 'rate_limited' }, 429, 'rate_limited'],
  ])('uses a content-free %s response', async (_name, row, status, state) => {
    const res = response();
    await handleQuickPastes(request(), res, clientWith([row]) as never, 'server-key');
    expect(res.statusCode).toBe(status);
    expect(res.body).toEqual({ state });
  });

  it('denies malformed unauthenticated protected operations before RPC access', async () => {
    const client = clientWith([]);
    const res = response();
    await handleQuickPastes(
      request({ device_id: 'not-a-device', credential: 'not-a-credential' }),
      res,
      client as never,
      'server-key',
    );
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ state: 'invalid' });
    expect(client.rpc).not.toHaveBeenCalled();
  });
});
