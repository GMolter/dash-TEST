import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ user: { id: 'user-1' }, from: vi.fn() }));
vi.mock('./useAuth', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('../lib/supabase', () => ({ supabase: { from: state.from } }));
import { readConfigurationCache, useDashboardConfiguration } from './useDashboardConfiguration';
import { useFreeformDashboard } from './useFreeformDashboard';

beforeEach(() => {
  localStorage.clear();
  state.user = { id: 'user-1' };
  state.from.mockImplementation(() => {
    const query = { select: () => query, eq: () => query, order: () => query, then: () => new Promise(() => {}) };
    return query;
  });
});

describe('dashboard warm starts', () => {
  it('restores disabled modules without waiting for the network', () => {
    localStorage.setItem('olio-dashboard-configuration-v1:user-1', JSON.stringify({ installations: [], modules: [
      { user_id: 'user-1', module_id: 'shortcuts', enabled: false, order_index: 2, column_span: 4 },
    ] }));
    const { result } = renderHook(useDashboardConfiguration);
    expect(result.current.loading).toBe(false);
    expect(result.current.modules.find(row => row.id === 'shortcuts')?.enabled).toBe(false);
    expect(result.current.installedPluginIds.size).toBe(0);
  });

  it('restores hidden cards and accepts a cached empty link collection', () => {
    localStorage.setItem('olio-freeform-dashboard-v1:user-1', JSON.stringify([
      { item_id: 'shortcut:qr', x: 0, y: 0, width: 4, height: 2, hidden: true },
    ]));
    localStorage.setItem('olio-quicklinks-v1:user-1', JSON.stringify({ links: [], folders: [] }));
    const { result } = renderHook(useFreeformDashboard);
    expect(result.current.loading).toBe(false);
    expect(result.current.layouts[0].hidden).toBe(true);
    expect(result.current.quicklinks).toEqual([]);
  });

  it('does not carry a previous account layout into another account', async () => {
    localStorage.setItem('olio-freeform-dashboard-v1:user-1', JSON.stringify([{ item_id: 'private', hidden: true }]));
    const { result, rerender } = renderHook(useFreeformDashboard);
    state.user = { id: 'user-2' };
    rerender();
    await waitFor(() => expect(result.current.layouts).toEqual([]));
    expect(result.current.loading).toBe(true);
  });

  it('rejects corrupt and cross-account configuration snapshots', () => {
    localStorage.setItem('olio-dashboard-configuration-v1:user-1', '{broken');
    expect(readConfigurationCache('user-1')).toBeNull();
    localStorage.setItem('olio-dashboard-configuration-v1:user-1', JSON.stringify({ installations: [], modules: [{ user_id: 'user-2', enabled: false }] }));
    expect(readConfigurationCache('user-1')).toBeNull();
  });

  it('applies visibility updates from another tab', () => {
    const { result } = renderHook(useDashboardConfiguration);
    act(() => {
      localStorage.setItem('olio-dashboard-configuration-v1:user-1', JSON.stringify({ installations: [], modules: [{ user_id: 'user-1', module_id: 'shortcuts', enabled: false }] }));
      window.dispatchEvent(new StorageEvent('storage', { key: 'olio-dashboard-configuration-v1:user-1' }));
    });
    expect(result.current.modules.find(row => row.id === 'shortcuts')?.enabled).toBe(false);
  });
});
