import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
  banRead: vi.fn(),
  banEvent: null as null | ((payload: { new: unknown }) => void),
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: auth.getSession,
      getUser: auth.getUser,
      signOut: auth.signOut,
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: auth.unsubscribe } } })),
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

  it("clears local auth state and falls back to local logout when global logout fails", async () => {
    auth.signOut.mockImplementation(async (options?: { scope?: string }) => options?.scope === "local" ? { error: null } : { error: new Error("global logout failed") });
    render(<AuthProvider><Probe /></AuthProvider>);
    fireEvent.click(await screen.findByText("Signed in"));
    await waitFor(() => expect(screen.getByText("Signed out")).toBeInTheDocument());
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
