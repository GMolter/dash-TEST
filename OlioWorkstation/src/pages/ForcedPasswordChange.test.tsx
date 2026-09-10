import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), getUser: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), fetch: vi.fn(),
  event: null as null | ((event: string, session: Session | null) => void),
}));
vi.mock('../lib/supabase', () => ({ supabase: {
  auth: { getSession: mocks.getSession, getUser: mocks.getUser, signInWithPassword: mocks.signIn, signOut: mocks.signOut,
    onAuthStateChange: (callback: typeof mocks.event) => { mocks.event = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; },
  },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
  channel: () => ({ on: () => ({ subscribe: () => ({}) }) }), removeChannel: vi.fn(),
} }));
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { ForcedPasswordChange } from './ForcedPasswordChange';
const original = { access_token: 'test-token', user: { id: 'test-user', email: 'test@example.invalid', app_metadata: { force_password_change: true } } } as unknown as Session;
function Gate() {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading</p>;
  return user?.app_metadata.force_password_change ? <ForcedPasswordChange /> : <h1>Organization setup</h1>;
}
async function fill(password = 'a-new-password-123', confirmation = password) {
  await screen.findByRole('heading', { name: 'Choose your own password' });
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: confirmation } });
  fireEvent.click(screen.getByRole('button', { name: 'Save password and continue' }));
}
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.getSession.mockResolvedValue({ data: { session: original }, error: null });
  mocks.getUser.mockResolvedValue({ data: { user: original.user }, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  mocks.signIn.mockImplementation(async () => {
    const session = { ...original, user: { ...original.user, app_metadata: { force_password_change: false } } };
    mocks.event?.('SIGNED_IN',session);
    return { data: { session, user: session.user }, error: null };
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('Required password change completion', () => {
  it('leaves the forced screen after saving and acquiring a fresh session', async () => {
    render(<AuthProvider><Gate /></AuthProvider>);
    await fill();
    expect(await screen.findByRole('heading', { name: 'Organization setup' })).toBeVisible();
    expect(mocks.signIn).toHaveBeenCalledWith({ email: 'test@example.invalid', password: 'a-new-password-123' });
    expect(screen.queryByText('Choose your own password')).not.toBeInTheDocument();
  });
  it('shows why short or mismatched passwords cannot continue', async () => {
    render(<AuthProvider><Gate /></AuthProvider>);
    await fill('short');
    expect(screen.getByRole('alert')).toHaveTextContent('at least 12');
    expect(mocks.fetch).not.toHaveBeenCalled();
    await fill('a-new-password-123','different-password-123');
    expect(screen.getByRole('alert')).toHaveTextContent('do not match');
  });
  it('retries sign-in without resetting the already saved password again', async () => {
    mocks.signIn.mockResolvedValueOnce({ data: { session: null, user: null }, error: { message: 'Connection failed' } });
    render(<AuthProvider><Gate /></AuthProvider>);
    await fill();
    expect(await screen.findByRole('alert')).toHaveTextContent('automatic sign-in failed');
    expect(screen.getByRole('heading', { name: 'Password change complete' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Try continuing again' }));
    expect(await screen.findByRole('heading', { name: 'Organization setup' })).toBeVisible();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.signIn).toHaveBeenCalledTimes(2);
  });
  it('does not treat an HTML rewrite or unsuccessful API response as a saved password', async () => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => { throw new Error('HTML response'); } });
    render(<AuthProvider><Gate /></AuthProvider>);
    await fill();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('could not complete'));
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save password and continue' })).toBeEnabled();
  });
});
