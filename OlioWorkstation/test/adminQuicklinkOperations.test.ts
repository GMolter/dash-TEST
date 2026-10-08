// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/admin/data';

const mocks = vi.hoisted(() => ({ plan: vi.fn(), rpc: vi.fn(), insert: vi.fn(), update: vi.fn(), access: vi.fn() }));
vi.mock('../api/_utils/adminAccess.js', () => ({ requireAdminAccess: mocks.access }));
vi.mock('../api/_utils/supabaseConfig.js', () => ({ getSupabaseServiceConfig: () => ({ ok: true, url: 'https://example.supabase.co', serviceKey: 'test' }) }));
vi.mock('../api/_utils/adminQuicklinks.js', () => ({ planQuicklinkOperation: mocks.plan }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ rpc: mocks.rpc, from: (table: string) => {
  if (table !== 'admin_audit_log') throw new Error(`Unexpected table: ${table}`);
  return { insert: (data: unknown) => { mocks.insert(data); return { select: () => ({ single: async () => mocks.insert.mock.results.at(-1)?.value }) }; }, update: (data: unknown) => { mocks.update(data); return { eq: async () => ({ error: null }) }; } };
} }) }));
const operation = { resource: 'quicklinks', kind: 'bulk-quicklinks', reason: 'Copy school links', values: { mode: 'copy', target_user_id: 'target' } };
const plan = { mode: 'copy', count: 2, summary: 'Copy from Avery to Blair / account root.', expected: { profiles: [], folders: [{ id: 'folder' }], links: [{ id: 'link' }], destination: [] }, folders: [{ id: 'new-folder' }], links: [{ id: 'new-link' }] };
async function request(body: unknown) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  await handler({ method: 'POST', body }, res);
  return { status: res.status.mock.calls.at(-1)?.[0], body: res.json.mock.calls.at(-1)?.[0] };
}
beforeEach(() => {
  vi.stubEnv('ADMIN_OPERATION_SECRET', 'test-only-secret');
  mocks.access.mockResolvedValue({ ok: true, userId: 'admin', email: 'admin@example.com', appOwner: true });
  mocks.plan.mockResolvedValue(plan);
  mocks.insert.mockReturnValue({ data: { id: 'audit' }, error: null });
  mocks.rpc.mockResolvedValue({ data: { count: 2, mode: 'copy' }, error: null });
});
afterEach(() => vi.unstubAllEnvs());
describe('reviewed quicklink operations', () => {
  it('previews destination and total contents, then executes one audited RPC', async () => {
    const prepared = await request({ phase: 'prepare', operation });
    expect(prepared.status).toBe(200);
    expect(prepared.body.preview).toMatchObject({ count: 2, summary: plan.summary });
    expect(mocks.rpc).not.toHaveBeenCalled();
    const executed = await request({ phase: 'execute', operation, operationToken: prepared.body.operationToken, confirmation: 'CONFIRM' });
    expect(executed.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('admin_bulk_quicklinks', { p_plan: plan });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ action: 'bulk-quicklinks', status: 'pending' }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'succeeded' }));
  });
  it('refuses changed contents after review without writing', async () => {
    const prepared = await request({ phase: 'prepare', operation });
    mocks.plan.mockResolvedValue({ ...plan, expected: { ...plan.expected, links: [{ id: 'link', title: 'Changed' }] } });
    const executed = await request({ phase: 'execute', operation, operationToken: prepared.body.operationToken, confirmation: 'CONFIRM' });
    expect(executed.status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it('refuses changed destinations and reused operation tokens', async () => {
    const prepared = await request({ phase: 'prepare', operation });
    const changed = await request({ phase: 'execute', operation: { ...operation, values: { ...operation.values, target_user_id: 'other' } }, operationToken: prepared.body.operationToken, confirmation: 'CONFIRM' });
    expect(changed.status).toBe(409);
    mocks.insert.mockReturnValue({ error: { code: '23505' } });
    const replay = await request({ phase: 'execute', operation, operationToken: prepared.body.operationToken, confirmation: 'CONFIRM' });
    expect(replay.status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('blocks unauthenticated callers before planning', async () => {
    mocks.access.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });
    expect((await request({ phase: 'prepare', operation })).status).toBe(401);
    expect(mocks.plan).not.toHaveBeenCalled();
  });
});
