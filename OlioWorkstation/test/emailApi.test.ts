// @vitest-environment node
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  hook: vi.fn(),
  dispatch: vi.fn(),
  admin: vi.fn(),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({}) }));
vi.mock('../api/_utils/supabaseConfig.js', () => ({
  getSupabaseServiceConfig: () => ({
    ok: true,
    url: 'https://example.supabase.co',
    serviceKey: 'test-only',
  }),
}));
vi.mock('../api/_utils/adminAccess.js', () => ({
  requireAdminAccess: mocks.access,
}));
vi.mock('../api/_utils/emailAuth.js', () => ({ enqueueAuthHook: mocks.hook }));
vi.mock('../api/_utils/emailWorker.js', () => ({
  dispatchEmail: mocks.dispatch,
}));
vi.mock('../api/_utils/emailAdmin.js', () => ({ emailAdmin: mocks.admin }));
import handler from '../api/email';
async function request(
  action: string,
  headers: Record<string, string> = {},
  body = '{}',
  method = 'POST',
) {
  const req = Object.assign(new PassThrough(), {
    method,
    query: { action },
    headers,
  });
  Object.defineProperty(req, 'body', {
    get() {
      throw new Error('The parsed body must not be read.');
    },
  });
  const res = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  const promise = handler(req as never, res as never);
  req.end(body);
  await promise;
  return res;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.access.mockResolvedValue({
    ok: false,
    status: 403,
    error: 'Admin access removed',
  });
  mocks.hook.mockResolvedValue(undefined);
  mocks.dispatch.mockResolvedValue({ processed: 0 });
});
afterEach(() => vi.unstubAllEnvs());
it('enforces methods and never exposes admin actions to the dispatcher credential', async () => {
  vi.stubEnv('EMAIL_DISPATCH_SECRET', 'dispatch-test');
  expect(
    (await request('dispatch', {}, '{}', 'GET')).status,
  ).toHaveBeenCalledWith(405);
  expect(
    (await request('dispatch', { authorization: 'Bearer wrong' })).status,
  ).toHaveBeenCalledWith(401);
  expect(
    (await request('drafts', { authorization: 'Bearer dispatch-test' })).status,
  ).toHaveBeenCalledWith(403);
  expect(mocks.admin).not.toHaveBeenCalled();
});
it('passes the exact raw body to hook verification without requiring an admin session', async () => {
  const raw = '{ "email_data": {"token_hash":"test-hash"} }';
  expect(
    (await request('hook', { 'webhook-id': 'event' }, raw)).status,
  ).toHaveBeenCalledWith(200);
  expect(mocks.hook).toHaveBeenCalledWith(
    {},
    raw,
    expect.objectContaining({ 'webhook-id': 'event' }),
  );
  expect(mocks.access).not.toHaveBeenCalled();
});
it('rejects enqueue failure without exposing token payloads or raw provider errors', async () => {
  mocks.hook.mockRejectedValue(new Error('SECRET PROVIDER ERROR'));
  const response = await request('hook');
  expect(response.status).toHaveBeenCalledWith(400);
  expect(JSON.stringify(response.json.mock.calls)).not.toContain('SECRET');
});
it('bounds raw body size before admin actions', async () => {
  mocks.access.mockResolvedValue({ ok: true, userId: 'admin' });
  const res = await request('save-draft', {}, 'x'.repeat(524289));
  expect(res.status).toHaveBeenCalledWith(400);
  expect(mocks.admin).not.toHaveBeenCalled();
});
