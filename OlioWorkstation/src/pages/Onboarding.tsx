import { useRef, useState, FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LayoutDashboard, Loader2, Mail } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { AnimatedBackground } from '../components/AnimatedBackground';

export function Onboarding() {
  const { signIn, signUp } = useAuth();
  const [creating, setCreating] = useState(false);
  const [offerAccount, setOfferAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState(false);
  const submitting = useRef(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    setError('');
    setOfferAccount(false);
    if (creating && password.length < 6) {
      setError('Choose a password with at least 6 characters.');
      return;
    }
    submitting.current = true;
    setLoading(true);
    try {
      const address = email.trim();
      if (creating) {
        const result = await signUp(address, password, displayName.trim() || undefined);
        if (!result.success) setError(result.error || 'We couldn’t create your account. Please try again.');
        else if (result.confirmationRequired) { setConfirmation(true); setPassword(''); }
      } else {
        const result = await signIn(address, password);
        if (!result.success) {
          if (result.code === 'invalid_credentials' || result.code === 'user_not_found' || result.error === 'Invalid login credentials') {
            setOfferAccount(true);
          } else {
            setError(result.code === 'email_not_confirmed'
              ? 'Please confirm your email using the link in your inbox, then sign in.'
              : result.error || 'We couldn’t sign you in. Please try again.');
          }
        }
      }
    } catch {
      setError('We couldn’t connect. Please check your connection and try again.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const inputClass = 'w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3.5 text-white placeholder:text-slate-500 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/20';
  const reset = () => { setCreating(false); setOfferAccount(false); setConfirmation(false); setError(''); };

  return (
    <div className="relative min-h-screen text-slate-100">
      <AnimatedBackground />
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 py-12 sm:px-8">
        <div className="mb-8 flex items-center gap-3">
          <span className="glass-control flex h-11 w-11 items-center justify-center"><LayoutDashboard aria-hidden="true" className="h-5 w-5 text-violet-300" /></span>
          <span className="text-xl font-semibold tracking-tight">Olio Workstation</span>
        </div>
        <section className="glass-panel w-full max-w-md rounded-[2rem] p-6 sm:p-9" aria-labelledby="auth-title">
          <div className="mb-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Your space to focus</p>
            <h1 id="auth-title" className="text-3xl font-semibold tracking-[-0.03em]">{confirmation ? 'Check your inbox' : creating ? 'Make yourself at home.' : 'Welcome to Olio.'}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">{confirmation ? 'One more step to get started.' : creating ? 'Create your account to bring your work together.' : 'Your projects, tools, and ideas. All in one place.'}</p>
          </div>
          {confirmation ? (
            <div role="status" className="space-y-5">
              <Mail aria-hidden="true" className="h-8 w-8 text-violet-300" />
              <p className="break-words text-sm leading-6 text-slate-300">Check <strong className="text-white">{email.trim()}</strong> for a confirmation link. If an account already exists, use your existing password to sign in. Check your spam folder if you don’t see an email.</p>
              <button onClick={reset} className="glass-control w-full px-4 py-3">Back to sign in</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <fieldset disabled={loading} className="space-y-5 disabled:opacity-60">
                {creating && <div>
                  <label htmlFor="auth-name" className="mb-2 block text-sm font-medium text-slate-300">Your name <span className="font-normal text-slate-500">(optional)</span></label>
                  <input id="auth-name" autoFocus autoComplete="name" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="What should we call you?" className={inputClass} />
                </div>}
                <div>
                  <label htmlFor="auth-email" className="mb-2 block text-sm font-medium text-slate-300">Email address</label>
                  <input id="auth-email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required value={email} onChange={e => { setEmail(e.target.value); setOfferAccount(false); setError(''); }} placeholder="you@example.com" className={inputClass} />
                </div>
                <div>
                  <label htmlFor="auth-password" className="mb-2 block text-sm font-medium text-slate-300">Password</label>
                  <div className="relative">
                    <input id="auth-password" type={showPassword ? 'text' : 'password'} autoComplete={creating ? 'new-password' : 'current-password'} required minLength={creating ? 6 : undefined} value={password} onChange={e => { setPassword(e.target.value); setOfferAccount(false); setError(''); }} aria-describedby={creating ? 'password-hint' : undefined} placeholder={creating ? 'Choose a password' : 'Enter your password'} className={`${inputClass} pr-14`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-2xl text-slate-400 hover:text-white focus-visible:outline focus-visible:outline-violet-400">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  </div>
                  {creating && <p id="password-hint" className="mt-2 text-xs text-slate-400">Use at least 6 characters.</p>}
                </div>
                {error && <p role="alert" className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
                {offerAccount && <div role="status" className="rounded-2xl border border-violet-300/20 bg-violet-400/10 p-4 text-sm leading-6 text-slate-300">
                  <p className="font-medium text-white">New to Olio?</p>
                  <p className="mt-1">We couldn’t sign you in with those details. Check your email and password, or create an account if you haven’t joined yet.</p>
                  <button type="button" onClick={() => { setCreating(true); setOfferAccount(false); setError(''); }} className="mt-3 font-medium text-violet-200 underline underline-offset-4 hover:text-white">Yes, create an account</button>
                </div>}
                <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-300/20 bg-violet-600 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(139,92,246,0.2)] transition hover:bg-violet-500 disabled:cursor-wait focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300">
                  {loading ? <><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />{creating ? 'Creating account…' : 'Signing in…'}</> : <>{creating ? 'Create account' : 'Sign in'}<ArrowRight aria-hidden="true" className="h-4 w-4" /></>}
                </button>
                {creating && <button type="button" onClick={reset} className="w-full text-sm text-slate-400 hover:text-white">Back to sign in</button>}
              </fieldset>
              {!creating && !offerAccount && <p className="text-center text-xs leading-5 text-slate-400">First time here? Enter your details to get started.</p>}
            </form>
          )}
        </section>
        <p className="mt-7 text-xs text-slate-500">A little less scattered. A little more together.</p>
      </main>
    </div>
  );
}
