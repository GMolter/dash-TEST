import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: auth.getSession,
      getUser: auth.getUser,
      signOut: auth.signOut,
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: auth.unsubscribe } } })),
    },
    from: vi.fn(),
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
    auth.getSession.mockResolvedValue({ data: { session: { access_token: "session-token", user: sessionUser } }, error: null });
    auth.getUser.mockResolvedValue({ data: { user: sessionUser }, error: null });
    auth.signOut.mockResolvedValue({ error: null });
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
