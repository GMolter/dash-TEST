import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppActivity } from './useAppActivity';
import { supabase } from '../lib/supabase';
vi.mock('../lib/supabase', () => ({ supabase: { rpc: vi.fn() } }));
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never);
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
describe('app visits', () => {
  it('records restored sessions and returns, but not hidden tabs or signed-out users', async () => {
    const { rerender, unmount } = renderHook(({ id }) => useAppActivity(id), { initialProps: { id: undefined as string | undefined } });
    expect(supabase.rpc).not.toHaveBeenCalled();
    await act(async () => rerender({ id: 'u1' }));
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    act(() => window.dispatchEvent(new Event('focus')));
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    await act(async () => { vi.advanceTimersByTime(120_000); });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(supabase.rpc).toHaveBeenCalledTimes(2);
    unmount();
    await act(async () => { vi.advanceTimersByTime(120_000); window.dispatchEvent(new Event('focus')); });
    expect(supabase.rpc).toHaveBeenCalledTimes(2);
  });
  it('recognizes returned RPC errors and retries without blocking the app', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ error: { code: 'PGRST202' }, data: null } as never);
    renderHook(() => useAppActivity('u1'));
    await act(async () => {});
    expect(warn).toHaveBeenCalledOnce();
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(supabase.rpc).toHaveBeenCalledTimes(2);
  });
});
