import { useState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";

export function ForcedPasswordChange() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 12) return setError("Password must be at least 12 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your sign-in session expired. Please sign in again.");
      const response = await fetch("/api/auth/complete-password-reset", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Password update failed.");
      await supabase.auth.refreshSession();
      window.location.replace("/");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Password update failed.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/55 p-7 shadow-2xl backdrop-blur-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-500/15"><KeyRound className="h-6 w-6 text-blue-300" /></div>
        <h1 className="mt-5 text-2xl font-semibold">Choose your own password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">An administrator created or reset this account with a temporary password. Replace it before continuing to Olio.</p>
        <label className="mt-6 block text-sm text-slate-300">New password<input autoFocus type="password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-white outline-none focus:border-blue-400/50" /></label>
        <label className="mt-4 block text-sm text-slate-300">Confirm password<input type="password" minLength={12} value={confirm} onChange={(event) => setConfirm(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-white outline-none focus:border-blue-400/50" /></label>
        {error && <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</div>}
        <button disabled={busy || password.length < 12 || password !== confirm} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/15 py-2.5 font-medium text-emerald-100 disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Save password and continue</button>
      </form>
    </div>
  );
}
