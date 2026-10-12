import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { AdminAccessBoundary } from './AdminAccessBoundary';
const mocks = vi.hoisted(() => ({ getSession: vi.fn(), onAuthStateChange: vi.fn(), mounts: vi.fn(), unmounts: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { auth: { getSession: mocks.getSession, onAuthStateChange: mocks.onAuthStateChange } } }));
vi.mock('./AdminQuicklinkBulkTools', () => ({ clearAdminQuicklinkClipboard: vi.fn() }));
function View() { useEffect(() => { mocks.mounts(); return () => mocks.unmounts(); }, []); return <div><input aria-label="Draft" defaultValue="keep my draft" /><button>Save</button></div>; }
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
it('mounts once on entry, keeps drafts on unchanged checks and transient errors, then remounts once per change', async () => {
 vi.useFakeTimers(); mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user' }, access_token: 'token' } } }); mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
 const snapshot = { canAccessAdmin: true, userId: 'user', appOwner: false, preset: 'read-only', permissions: [], accessVersion: '1' };
 const fetcher = vi.fn().mockImplementation(async () => new Response(JSON.stringify(snapshot))); vi.stubGlobal('fetch', fetcher);
 const view = render(<AdminAccessBoundary><View /></AdminAccessBoundary>);
 await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
 expect(mocks.mounts).toHaveBeenCalledTimes(1); expect(screen.getByLabelText('Draft')).toHaveValue('keep my draft');
 fetcher.mockRejectedValue(new Error('offline')); await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
 expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled(); expect(mocks.unmounts).not.toHaveBeenCalled();
 fetcher.mockImplementation(async () => new Response(JSON.stringify(snapshot))); await act(async () => { window.dispatchEvent(new Event('online')); await vi.advanceTimersByTimeAsync(0); });
 expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled(); expect(mocks.mounts).toHaveBeenCalledTimes(1);
 snapshot.accessVersion = '2'; await act(async () => { window.dispatchEvent(new Event('focus')); await vi.advanceTimersByTimeAsync(0); });
 expect(mocks.mounts).toHaveBeenCalledTimes(2); expect(mocks.unmounts).toHaveBeenCalledTimes(1);
 view.unmount();
});
