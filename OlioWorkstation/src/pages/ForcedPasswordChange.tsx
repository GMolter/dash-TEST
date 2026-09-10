import { useRef, useState, type FormEvent } from 'react';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export function ForcedPasswordChange() {
  const { signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const account = useRef<{ id: string; email: string } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    setError(null);
    if (password.length < 12) return setError('Password must be at least 12 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    submitting.current = true;
    setBusy(true);
    let passwordSaved = saved;
    try {
      if (!passwordSaved) {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const session = data.session;
        if (!session?.access_token || !session.user.email) throw new Error('Your sign-in session expired. Sign out and sign in again.');
        account.current = { id: session.user.id, email: session.user.email };
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 20000);
        try {
          const response = await fetch('/api/auth/complete-password-reset', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
            signal: controller.signal,
          });
          const body = await response.json().catch(() => null);
          if (!response.ok || body?.ok !== true) throw new Error(body?.error || 'The password service could not complete the request. Please try again.');
        } finally {
          window.clearTimeout(timer);
        }
        passwordSaved = true;
        setSaved(true);
      }
      if (!account.current) throw new Error('Sign out and sign in again with your new password.');
      // Obtain a fresh session with current server metadata. Refreshing the old
      // temporary-password session can fail or retain the forced-change screen.
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: account.current.email, password });
      if (signInError || !data.session || data.user?.id !== account.current.id) {
        throw new Error('Your password change is complete, but automatic sign-in failed. Try continuing again, or sign out and sign in with your new password.');
      }
      if (data.user.app_metadata?.force_password_change === true) {
        throw new Error('Your account still requires a password change. Please contact your administrator.');
      }
      // SIGNED_IN updates AuthProvider and dismisses this screen. Preserve the
      // current route (including pending launcher authorization) without reload.
      setPassword('');
      setConfirm('');
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Password update failed. Please try again.';
      setError(nextError instanceof Error && nextError.name === 'AbortError'
        ? 'The request timed out. Try again; a completed password change will not be repeated.' : message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 p-6 text-white">
      <form onSubmit={submit} noValidate className="glass-panel w-full max-w-md rounded-3xl p-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-500/15"><KeyRound aria-hidden="true" className="h-6 w-6 text-violet-300" /></div>
        <h1 className="mt-5 text-2xl font-semibold">{saved ? 'Password change complete' : 'Choose your own password'}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{saved ? 'Finishing sign-in with your new password.' : 'Replace your temporary password before continuing to Olio.'}</p>
        {!saved && <fieldset disabled={busy}>
          <label htmlFor="new-password" className="mt-6 block text-sm text-slate-300">New password</label>
          <input id="new-password" autoFocus required autoComplete="new-password" aria-describedby="password-requirements" type="password" value={password} onChange={event => { setPassword(event.target.value); setError(null); }} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-white outline-none focus:border-violet-400/50" />
          <p id="password-requirements" className="mt-2 text-xs text-slate-400">Use at least 12 characters. Choose a password different from your temporary one.</p>
          <label htmlFor="confirm-password" className="mt-4 block text-sm text-slate-300">Confirm password</label>
          <input id="confirm-password" required autoComplete="new-password" type="password" value={confirm} onChange={event => { setConfirm(event.target.value); setError(null); }} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-white outline-none focus:border-violet-400/50" />
        </fieldset>}
        {error && <div role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</div>}
        <button type="submit" disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 font-medium text-white hover:bg-violet-500 disabled:opacity-50">{busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ShieldCheck aria-hidden="true" className="h-4 w-4" />}{busy ? (saved ? 'Signing in…' : 'Saving password…') : saved ? 'Try continuing again' : 'Save password and continue'}</button>
        <button type="button" disabled={busy} onClick={() => { void signOut(); }} className="mt-4 w-full text-sm text-slate-400 hover:text-white disabled:opacity-50">Sign out</button>
      </form>
    </div>
  );
}
