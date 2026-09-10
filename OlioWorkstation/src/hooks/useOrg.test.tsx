import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({
  rpc: vi.fn(), signOut: vi.fn(),
  user: { id: 'new-user' } as { id: string } | null,
  profile: { id: 'new-user', org_id: null as string | null, role: 'member', display_name: 'New user' },
  organization: { id: 'team', name: 'Team', code: '0936', owner_id: 'owner' },
}));
vi.mock('./useAuth', () => ({ useAuth: () => ({ user: db.user, loading: false, signOut: db.signOut }) }));
vi.mock('../lib/supabase', () => ({ supabase: {
  rpc: db.rpc,
  from: (table: string) => ({ select: () => ({ eq: () => Object.assign(Promise.resolve({ data: [db.profile], error: null }), {
    maybeSingle: async () => ({ data: db.profile, error: null }),
    single: async () => ({ data: table === 'organizations' ? db.organization : db.profile, error: null }),
  }) }) }),
} }));
import { OrgProvider, useOrg } from './useOrg';
const wrapper = ({ children }: { children: ReactNode }) => <OrgProvider>{children}</OrgProvider>;

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  db.user = { id: 'new-user' };
  db.profile = { id: 'new-user', org_id: null, role: 'member', display_name: 'New user' };
  db.rpc.mockImplementation(async (operation: string) => {
    db.profile = { ...db.profile, org_id: 'team', role: operation === 'create_organization_with_owner' ? 'owner' : 'member' };
    return { data: { profile: db.profile, organization: db.organization }, error: null };
  });
});

describe('Organization setup transactions', () => {
  it('joins by code through the RPC and loads the committed membership', async () => {
    const { result } = renderHook(useOrg, { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { expect(await result.current.joinOrg(' 0936 ')).toEqual({ success: true }); });
    expect(db.rpc).toHaveBeenCalledWith('join_organization_by_code', { p_code: '0936' });
    expect(result.current.profile?.org_id).toBe('team');
    expect(result.current.organization?.id).toBe('team');
  });
  it('creates the organization and owner through one RPC', async () => {
    const { result } = renderHook(useOrg, { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { expect(await result.current.createOrg(' Team ')).toEqual({ success: true }); });
    expect(db.rpc).toHaveBeenCalledWith('create_organization_with_owner', { p_name: 'Team' });
    expect(result.current.profile?.role).toBe('owner');
  });
  it('preserves actionable PostgREST error messages', async () => {
    db.rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'Organization not found. Check the code and try again.' } });
    const { result } = renderHook(useOrg, { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { expect(await result.current.joinOrg('0936')).toEqual({ success: false, error: 'Organization not found. Check the code and try again.' }); });
  });
  it('rejects invalid inputs without making a database call', async () => {
    const { result } = renderHook(useOrg, { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect((await result.current.joinOrg('93')).success).toBe(false);
    expect((await result.current.createOrg(' ')).success).toBe(false);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it('does not report success for an empty RPC result', async () => {
    db.rpc.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(useOrg, { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { expect((await result.current.createOrg('Team')).success).toBe(false); });
    expect(result.current.profile?.org_id).toBeNull();
  });
});
