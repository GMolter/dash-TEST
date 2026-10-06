// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import handler from '../api/admin/data';

vi.mock('../api/_utils/adminAccess.js', () => ({ requireAdminAccess: async () => ({ ok: true, appOwner: true }) }));
vi.mock('../api/_utils/supabaseConfig.js', () => ({ getSupabaseServiceConfig: () => ({ ok: true, url: 'https://preview.supabase.co', serviceKey: 'test-key' }) }));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

it.each(['live', 'scheduled'])('applies the %s window to the database query and count before pagination', async bannerView => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-06T02:00:00Z'));
  vi.stubEnv('ADMIN_OPERATION_SECRET', 'test-only-secret');
  const fetcher = vi.fn(async () => new Response(JSON.stringify([{ id: 'live-banner', message: 'Hello', enabled: true }]), { status: 200, headers: { 'Content-Type': 'application/json', 'Content-Range': '20-20/21' } }));
  vi.stubGlobal('fetch', fetcher);
  const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  await handler({ method: 'GET', query: { resource: 'dashboard-alerts', bannerView, page: '2', pageSize: '20' } }, response);
  expect(response.status).toHaveBeenCalledWith(200);
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ total: 21, page: 2, rows: [expect.objectContaining({ _admin_id: 'live-banner' })] }));
  const request = new URL(String((fetcher.mock.calls[0] as unknown[])[0]));
  expect(request.pathname).toBe('/rest/v1/dashboard_alerts');
  expect(request.searchParams.get('enabled')).toBe('eq.true');
  expect(request.searchParams.getAll('or')).toContain('(ends_at.is.null,ends_at.gt.2026-10-06T02:00:00.000Z)');
  if (bannerView === 'live') expect(request.searchParams.getAll('or')).toContain('(starts_at.is.null,starts_at.lte.2026-10-06T02:00:00.000Z)');
  else expect(request.searchParams.get('starts_at')).toBe('gt.2026-10-06T02:00:00.000Z');
  expect(request.searchParams.get('offset')).toBe('20');
  expect(request.searchParams.get('limit')).toBe('20');
});
