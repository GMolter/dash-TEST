// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/admin/data';
import { presetPermissions } from '../api/_utils/adminPermissions';
const mocks = vi.hoisted(() => ({ access: vi.fn(), from: vi.fn(), rpc: vi.fn() }));
vi.mock('../api/_utils/adminAccess.js', () => ({ requireAdminAccess: mocks.access }));
vi.mock('../api/_utils/supabaseConfig.js', () => ({ getSupabaseServiceConfig: () => ({ ok: true, url: 'https://example.supabase.co', serviceKey: 'test' }) }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: mocks.from, rpc: mocks.rpc }) }));
beforeEach(() => { vi.stubEnv('ADMIN_OPERATION_SECRET','test'); mocks.access.mockResolvedValue({ ok: true, userId: 'reader', appOwner: false, permissions: presetPermissions('read-only') }); });
afterEach(() => vi.unstubAllEnvs());
it('approves a legacy request with the selected snapshot through the atomic RPC', async () => {
 vi.stubEnv('ADMIN_PERMISSION_ASSIGNMENTS_ENABLED', 'true');
 mocks.access.mockResolvedValue({ ok: true, userId: 'owner', appOwner: true, permissions: [] });
 const row = { id: 'request', request_kind: 'admin_promotion', target_user_id: 'target', status: 'pending' };
 mocks.from.mockImplementation((table: string) => {
   const result = { data: table === 'admin_permission_assignments' ? { revision: 0 } : table === 'admin_audit_log' ? { id: 'audit' } : row, error: null };
   const chain: any = { then: (resolve: any) => Promise.resolve(result).then(resolve) };
   for (const name of ['select','eq','in','insert','update','maybeSingle','single']) chain[name] = vi.fn(() => chain);
   return chain;
 });
 mocks.rpc.mockResolvedValue({ data: { ...row, status: 'approved' }, error: null });
 const operation = { resource: 'admin-access-requests', kind: 'approve-admin', ids: ['request'], reason: 'Assigned duties', values: { preset: 'read-only', permissions: presetPermissions('read-only'), revision: 0 } };
 const prepared = await request('POST', {}, { phase: 'prepare', operation });
 expect(prepared.status).toHaveBeenCalledWith(200);
 const token = prepared.json.mock.calls.at(-1)![0];
 const executed = await request('POST', {}, { phase: 'execute', operation, operationToken: token.operationToken, confirmation: token.confirmation });
 expect(executed.status).toHaveBeenCalledWith(200);
 expect(mocks.rpc).toHaveBeenCalledWith('admin_approve_with_permissions', expect.objectContaining({ p_preset: 'read-only', p_grants: presetPermissions('read-only'), p_revision: 0, p_request_id: 'request' }));
});
async function request(method: string, query: any, body?: any) { const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() }; await handler({ method, query, body },res); return res; }
describe('forged admin requests', () => {
 it.each(['prepare','execute','reveal'])('denies mutations in %s before any data access', async phase => {
  const res = await request('POST',{}, { phase, operation: { resource: 'features', kind: 'update', values: { title: 'attack' }, reason: 'forged', ids: ['id'] }, operationToken: 'previous-token' });
  expect(res.status).toHaveBeenCalledWith(403); expect(mocks.from).not.toHaveBeenCalled();
 });
 it('denies hidden resources, overview-only assignments, and permission management', async () => {
  mocks.access.mockResolvedValue({ ok: true, appOwner: false, permissions: [] });
  for (const resource of ['users','user-account','permission-catalog','permission-assignment']) expect((await request('GET',{ resource })).status).toHaveBeenCalledWith(403);
  expect(mocks.from).not.toHaveBeenCalled();
 });
 it('rejects hidden sort and filter inference before querying records', async () => {
  mocks.access.mockResolvedValue({ ok: true, appOwner: false, permissions: ['sections.people.read','users.read','users.fields.display_name.read'] });
  expect((await request('GET',{ resource: 'users', sort: 'email' })).status).toHaveBeenCalledWith(403);
  expect((await request('GET',{ resource: 'users', filters: JSON.stringify({ org_id: 'hidden' }) })).status).toHaveBeenCalledWith(403);
  expect(mocks.from).not.toHaveBeenCalled();
 });
});

it('preserves owner protection when a single-record request hides ownership columns', async () => {
 mocks.access.mockResolvedValue({ ok: true, appOwner: false, permissions: ['sections.workspace.read', 'quick-pastes.read', 'quick-pastes.fields.title.read'] });
 mocks.from.mockImplementation((table: string) => {
   const result = table === 'quick_pastes' ? { data: { id: 'record', user_id: 'protected-owner', title: 'Owner private title' }, error: null } : { data: [{ id: 'protected-owner' }], error: null };
   const chain: any = { select: vi.fn(() => chain), eq: vi.fn(() => chain), in: vi.fn(() => chain), maybeSingle: async () => result, then: (resolve: any) => Promise.resolve(result).then(resolve) };
   return chain;
 });
 const res = await request('GET', { resource: 'quick-pastes', record: 'record' });
 expect(res.status).toHaveBeenCalledWith(200);
 expect(res.json.mock.calls.at(-1)?.[0].rows).toEqual([{ _admin_id: expect.stringMatching(/^opaque\./), _admin_protected: true }]);
});
