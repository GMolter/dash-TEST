import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from '@supabase/supabase-js';

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
  banRead: vi.fn(),
  banEvent: null as null | ((payload: { new: unknown }) => void),
  authEvent: null as null | ((event: string, session: Session | null) => void),
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: auth.getSession,
      getUser: auth.getUser,
      signOut: auth.signOut,
      onAuthStateChange: vi.fn((callback: (event: string, session: Session | null) => void) => {
        auth.authEvent = callback;
        return { data: { subscription: { unsubscribe: auth.unsubscribe } } };
      }),
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: auth.banRead }) }) }),
    channel: () => ({ on: (_type: unknown, _filter: unknown, callback: (payload: { new: unknown }) => void) => {
      auth.banEvent = callback;
      return { subscribe: () => ({}) };
    } }),
    removeChannel: vi.fn(),
  },
}));

import { AuthProvider, useAuth } from "./useAuth";

const sessionUser = { id: "user-1", app_metadata: { force_password_change: false } };

function Probe() {
  const { user, loading, signOut } = useAuth();
  if (loading) return <div>Loading</div>;
  return <button onClick={() => { void signOut(); }}>
    {!user ? "Signed out" : user.app_metadata.force_password_change ? "Change required" : "Signed in"}
  </button>;
}

describe("AuthProvider session safety", () => {
  afterEach(() => vi.useRealTimers());
  it('finishes startup on a fresh session event even when the initial read is stuck', async () => {
    auth.getSession.mockImplementationOnce(() => new Promise(() => {}));
    render(<AuthProvider><Probe /></AuthProvider>);
    act(() => auth.authEvent?.('TOKEN_REFRESHED', { access_token: 'new-token', user: sessionUser } as unknown as Session));
    expect(screen.getByText('Signed in')).toBeInTheDocument();
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('shows recovery after a stalled check and automatically recovers when it completes', async () => {
    vi.useFakeTimers();
    let finish: ((value: unknown) => void) | undefined;
    auth.getSession.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => { await vi.advanceTimersByTimeAsync(12_000); });
    expect(screen.getByText('Sign-in is temporarily delayed')).toBeInTheDocument();
    expect(auth.getSession).toHaveBeenCalledTimes(1);
    expect(auth.signOut).not.toHaveBeenCalled();
    await act(async () => { finish?.({ data: { session: { access_token: 'new-token', user: sessionUser } }, error: null }); });
    expect(screen.getByText('Signed in')).toBeInTheDocument();
    expect(screen.queryByText('Sign-in is temporarily delayed')).not.toBeInTheDocument();
  });

  it('does not show the login form or clear saved auth when startup refresh is temporarily unavailable', async () => {
    auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('Refresh temporarily unavailable') });
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText('Sign-in is temporarily delayed')).toBeInTheDocument();
    expect(screen.queryByText('Signed out')).not.toBeInTheDocument();
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('retries a failed startup only after a minute and recovers without signing out', async () => {
    vi.useFakeTimers();
    auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('Rate limited') });
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => { await vi.advanceTimersByTimeAsync(59_000); });
    expect(auth.getSession).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Sign-in is temporarily delayed')).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(auth.getSession).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Signed in')).toBeInTheDocument();
    expect(auth.signOut).not.toHaveBeenCalled();
  });
  it('does not overwrite a new login with a stale initial session read', async () => {
    let finish: ((value: unknown) => void) | undefined;
    auth.getSession.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<AuthProvider><Probe /></AuthProvider>);
    act(() => auth.authEvent?.('SIGNED_IN', { access_token: 'new-token', user: sessionUser } as unknown as Session));
    await act(async () => { finish?.({ data: { session: null }, error: null }); });
    expect(await screen.findByText('Signed in')).toBeInTheDocument();
    expect(auth.signOut).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    auth.banRead.mockResolvedValue({ data: null, error: null });
    auth.getSession.mockResolvedValue({ data: { session: { access_token: "session-token", user: sessionUser } }, error: null });
    auth.getUser.mockResolvedValue({ data: { user: sessionUser }, error: null });
    auth.signOut.mockResolvedValue({ error: null });
  });

  it("immediately replaces private views with the ban reason and signs out on a realtime ban", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText("Signed in");
    act(() => auth.banEvent?.({ new: { user_id: "user-1", banned_until: "2099-01-01T00:00:00Z", reason: "Repeated harassment" } }));
    expect(screen.getByRole("alert")).toHaveTextContent("Repeated harassment");
    expect(screen.queryByText("Signed in")).not.toBeInTheDocument();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("checks a persisted session for an existing ban before exposing private views", async () => {
    auth.banRead.mockResolvedValue({ data: { user_id: 'user-1', banned_until: '2099-01-01T00:00:00Z', reason: 'Account policy violation' }, error: null });
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Account policy violation');
    expect(screen.queryByText('Signed in')).not.toBeInTheDocument();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it("does not sign out for expired bans or another user's event", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText("Signed in");
    act(() => auth.banEvent?.({ new: { user_id: "user-1", banned_until: "2000-01-01T00:00:00Z", reason: "Expired" } }));
    act(() => auth.banEvent?.({ new: { user_id: "someone-else", banned_until: "2099-01-01T00:00:00Z", reason: "Other account" } }));
    expect(screen.getByText("Signed in")).toBeInTheDocument();
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("uses current server metadata so an admin password reset blocks an existing session", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { ...sessionUser, app_metadata: { force_password_change: true } } }, error: null });
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText("Change required")).toBeInTheDocument();
    expect(auth.getUser).toHaveBeenCalledWith("session-token");
  });

  it('discards a session rejected by auth instead of restoring its cached user', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: { status: 401, code: 'session_not_found' } });
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText('Signed out')).toBeInTheDocument();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('preserves the session and backs off focus checks after rate limiting', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: { status: 429 } });
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText('Signed in');
    fireEvent.focus(window);
    fireEvent(document, new Event('visibilitychange'));
    expect(auth.getSession).toHaveBeenCalledTimes(1);
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('coalesces focus checks while session verification is pending', async () => {
    let finish: ((value: unknown) => void) | undefined;
    auth.getUser.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(auth.getUser).toHaveBeenCalledTimes(1));
    fireEvent.focus(window);
    fireEvent(document, new Event('visibilitychange'));
    expect(auth.getSession).toHaveBeenCalledTimes(1);
    await act(async () => finish?.({ data: { user: sessionUser }, error: null }));
    expect(await screen.findByText('Signed in')).toBeInTheDocument();
  });

  it('does not clear a new login when verification of the previous session fails', async () => {
    let finish: ((value: unknown) => void) | undefined;
    auth.getUser.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(auth.getUser).toHaveBeenCalledTimes(1));
    act(() => auth.authEvent?.('SIGNED_IN', { access_token: 'new-token', user: sessionUser } as unknown as Session));
    await act(async () => finish?.({ data: { user: null }, error: { status: 401 } }));
    expect(await screen.findByText('Signed in')).toBeInTheDocument();
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("clears local auth state and falls back to local logout when global logout fails", async () => {
    auth.signOut.mockImplementation(async (options?: { scope?: string }) => options?.scope === "local" ? { error: null } : { error: new Error("global logout failed") });
    render(<AuthProvider><Probe /></AuthProvider>);
    fireEvent.click(await screen.findByText("Signed in"));
    await waitFor(() => expect(screen.getByText("Signed out")).toBeInTheDocument());
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
