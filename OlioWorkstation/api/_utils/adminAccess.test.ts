import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requireAdminAccess } from './adminAccess';
import { presetPermissions } from './adminPermissions';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), tables: {} as Record<string, any> }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser: mocks.getUser }, from: (table: string) => ({ select: () => ({ eq: () => ({ ...mocks.tables[table], maybeSingle: async () => mocks.tables[table], then: (resolve: any) => Promise.resolve(mocks.tables[table]).then(resolve) }) }) }) }) }));
const request = { headers: { authorization: 'Bearer session' } };
beforeEach(() => {
 vi.stubEnv('SUPABASE_URL','https://example.supabase.co'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test');
 mocks.getUser.mockResolvedValue({ data: { user: { id: 'admin' } }, error: null });
 mocks.tables = { profiles: { data: { app_admin: true, app_owner: false, email: 'admin@example.com' } }, account_ban_state: { data: null }, admin_permission_assignments: { data: { preset: 'read-only', revision: 1 } }, admin_permission_grants: { data: presetPermissions('read-only').map(permission_key => ({ permission_key })) } };
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe('current database admin authorization', () => {
 it('loads explicit grants and detects direct grant edits', async () => {
  const first = await requireAdminAccess(request); expect(first).toMatchObject({ ok: true, preset: 'read-only' });
  mocks.tables.admin_permission_grants.data = [];
  const second = await requireAdminAccess(request); expect(second).toMatchObject({ ok: true, permissions: [] });
  if (first.ok && second.ok) expect(first.accessVersion).not.toBe(second.accessVersion);
 });
 it('does not infer grants from the legacy boolean', async () => {
  mocks.tables.admin_permission_assignments.data = null;
  expect(await requireAdminAccess(request)).toMatchObject({ ok: false, status: 403 });
 });
 it('fails closed on storage errors without disguising a transient failure as revocation', async () => {
  mocks.tables.admin_permission_grants = { error: { code: '42P01' } };
  expect(await requireAdminAccess(request)).toMatchObject({ ok: false, status: 503 });
 });
 it('keeps the version stable on unrelated profile updates and expired bans', async () => {
  const first = await requireAdminAccess(request);
  mocks.tables.profiles.data.email = 'changed@example.com'; mocks.tables.admin_permission_assignments.data.revision++;
  mocks.tables.account_ban_state.data = { banned_until: '2000-01-01' };
  expect(await requireAdminAccess(request)).toMatchObject({ accessVersion: first.ok ? first.accessVersion : '' });
 });
 it.each(['removed','banned','deleted'])('denies %s accounts', async state => {
  if (state === 'removed') mocks.tables.profiles.data.app_admin = false;
  if (state === 'deleted') mocks.tables.profiles.data = null;
  if (state === 'banned') mocks.tables.account_ban_state.data = { banned_until: '2999-01-01' };
  expect(await requireAdminAccess(request)).toMatchObject({ ok: false, status: 403 });
 });
 it('rejects expired sessions and old cookies', async () => {
  expect(await requireAdminAccess({ headers: { cookie: 'admin_session=old' } })).toMatchObject({ ok: false, status: 401 });
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } });
  expect(await requireAdminAccess(request)).toMatchObject({ ok: false, status: 401 });
 });
});
