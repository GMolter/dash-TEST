import { useEffect, useState } from 'react';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
const inputClass =
  'mt-2 w-full rounded-xl border border-white/15 bg-slate-900 p-3';
export function EmailAuthentication({ mode }: { mode: 'confirm' | 'forgot' | 'reset' }) {
  const { user } = useAuth();
  const [credentials] = useState(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    return {
      token_hash: params.get('token_hash') || '',
      type: params.get('type') || '',
    };
  });
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [repeat, setRepeat] = useState('');
  const [verified, setVerified] = useState(mode === 'reset'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    // Supabase handles legacy recovery session fragments before this page is shown.
    // Custom-hook token_hash links are deliberately cleared without consuming them.
    if (mode !== 'reset') window.history.replaceState({}, '', window.location.pathname);
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [mode]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const request = async (action: 'recovery' | 'resend') => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/email?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Email request failed.');
      setNotice(body.message);
      setCooldown(60);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Email request failed.');
    } finally {
      setBusy(false);
    }
  };
  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      if (
        !credentials.token_hash ||
        !['signup', 'recovery', 'email_change', 'invite'].includes(
          credentials.type,
        )
      )
        throw new Error('This link is invalid. Request a new email.');
      const { error } = await supabase.auth.verifyOtp({
        token_hash: credentials.token_hash,
        type: credentials.type as EmailOtpType,
      });
      if (error)
        throw new Error(
          'This link expired or has already been used. Request a new email.',
        );
      setVerified(true);
      setNotice(
        credentials.type === 'recovery' || credentials.type === 'invite'
          ? 'Choose your new password.'
          : 'Email confirmed. You can continue to Olio.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Confirmation failed.');
    } finally {
      setBusy(false);
    }
  };
  const updatePassword = async () => {
    setBusy(true);
    setError('');
    try {
      if (password.length < 12 || password !== repeat)
        throw new Error(
          'Use at least 12 characters and make sure both passwords match.',
        );
      // Temporary-password accounts must still use the dedicated completion endpoint.
      if (user?.app_metadata?.force_password_change === true) {
        const { data } = await supabase.auth.getSession();
        const response = await fetch('/api/auth/complete-password-reset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.session?.access_token}`,
          },
          body: JSON.stringify({ password }),
        });
        if (!response.ok) throw new Error('Could not complete password reset.');
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      }
      setPassword('');
      setRepeat('');
      await supabase.auth.signOut();
      setNotice('Password updated. Return to Olio to sign in.');
      setVerified(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Password update failed.');
    } finally {
      setBusy(false);
    }
  };
  const needsPassword =
    verified && (['recovery', 'invite'].includes(credentials.type) || (mode === 'reset' && !!user));
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-5 text-white">
      <section className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 p-7">
        <h1 className="text-2xl font-semibold">
          {mode === 'forgot'
            ? 'Reset your password'
            : needsPassword
              ? 'Set a new password'
              : 'Confirm your email'}
        </h1>
        <p className="text-sm text-slate-400">
          {mode === 'forgot'
            ? 'Request a recovery link. Email can take about a minute to start sending.'
            : mode === 'reset' ? 'Choose a new password for your signed-in recovery session. If the session has expired, request another recovery link.' : 'Continue below to use this link. Opening this page alone does not confirm your email.'}
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-blue-200">
            {notice}
          </p>
        )}
        <fieldset disabled={busy} className="space-y-4">
          {mode === 'confirm' &&
            !verified &&
            credentials.token_hash &&
            !notice && (
              <button
                className="w-full rounded-xl bg-blue-600 p-3"
                onClick={() => void confirm()}
              >
                Continue with this link
              </button>
            )}
          {needsPassword && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void updatePassword();
              }}
            >
              <label className="block text-sm">
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  required
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Repeat password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  required
                  className={inputClass}
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value)}
                />
              </label>
              <button className="w-full rounded-xl bg-blue-600 p-3">
                Update password
              </button>
            </form>
          )}
          {(mode === 'forgot' || (mode === 'reset' && !needsPassword && !notice) ||
            (!verified && !credentials.token_hash) ||
            !!error) && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void request(
                  mode === 'forgot' || mode === 'reset' || credentials.type === 'recovery'
                    ? 'recovery'
                    : 'resend',
                );
              }}
            >
              <label className="block text-sm">
                Email address
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <button
                disabled={cooldown > 0}
                className="w-full rounded-xl bg-blue-600 p-3 disabled:opacity-50"
              >
                {cooldown
                  ? `Try again in ${cooldown}s`
                  : mode === 'forgot' || mode === 'reset'
                    ? 'Send recovery link'
                    : 'Resend confirmation'}
              </button>
            </form>
          )}
        </fieldset>
        <a
          className="block text-center text-sm text-slate-400 underline"
          href="/"
        >
          Back to Olio
        </a>
      </section>
    </main>
  );
}
