import { useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useOrg } from '../hooks/useOrg';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { getStoredAppBackgroundTheme, getStoredAppBackgroundThemePresets, type AppBackgroundPreset, type AppBackgroundTheme } from '../lib/appTheme';
import { Building2, Users, ArrowLeft, ArrowRight, LogOut, LayoutDashboard, Loader2 } from 'lucide-react';

type Step = 'choose' | 'join' | 'create';
type Props = { backgroundTheme?: AppBackgroundTheme; backgroundPreset?: AppBackgroundPreset };

export function OrgSetup({ backgroundTheme = getStoredAppBackgroundTheme(), backgroundPreset = getStoredAppBackgroundThemePresets()[backgroundTheme] }: Props) {
  const { signOut } = useAuth();
  const { joinOrg, createOrg } = useOrg();
  const [step, setStep] = useState<Step>('choose');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [orgName, setOrgName] = useState('');
  const submitting = useRef(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current || step === 'choose') return;
    setError('');
    if (step === 'join' && !/^\d{4}$/.test(joinCode.trim())) {
      setError('Organization code must be 4 digits.');
      return;
    }
    if (step === 'create' && (!orgName.trim() || orgName.trim().length > 100)) {
      setError('Organization name must be between 1 and 100 characters.');
      return;
    }
    submitting.current = true;
    setLoading(true);
    try {
      const result = step === 'join' ? await joinOrg(joinCode.trim()) : await createOrg(orgName.trim());
      if (!result.success) setError(result.error || 'Could not complete setup. Please try again.');
    } catch {
      setError('We couldn’t connect. Please check your connection and try again.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const selectStep = (next: Step) => { setStep(next); setError(''); };
  const inputClass = 'w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3.5 text-white placeholder:text-slate-500 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/20';
  const Icon = step === 'create' ? Building2 : Users;

  return (
    <div className="relative min-h-screen text-slate-100">
      <AnimatedBackground theme={backgroundTheme} preset={backgroundPreset} />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="glass-control flex h-10 w-10 items-center justify-center"><LayoutDashboard aria-hidden="true" className="h-5 w-5 text-violet-300" /></span>
          <span className="text-sm font-semibold tracking-tight sm:text-lg">Olio Workstation</span>
        </div>
        <button type="button" disabled={loading} onClick={() => { void signOut(); }} className="glass-control inline-flex items-center gap-2 px-3 py-2 text-sm disabled:opacity-50"><LogOut aria-hidden="true" className="h-4 w-4" /><span>Sign out</span></button>
      </header>
      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-col px-5 pb-16 pt-8 sm:px-8 sm:pt-16">
        {step === 'choose' ? <>
          <div className="mb-9 text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Better together</p>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Find your people.</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">Join your team’s organization, or start a space of your own.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {([{ id: 'join', icon: Users, title: 'Join an organization', description: 'Already have a team? Use their 4-digit invite code to get connected.', action: 'Enter invite code' }, { id: 'create', icon: Building2, title: 'Create an organization', description: 'Bring your team together in a shared space for links, projects, and ideas.', action: 'Create your space' }] as const).map(option => <button key={option.id} type="button" onClick={() => selectStep(option.id)} className="glass-panel group rounded-[1.75rem] p-7 text-left transition hover:border-violet-300/30 hover:bg-slate-900/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300">
              <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-400/10 text-violet-300"><option.icon aria-hidden="true" className="h-6 w-6" /></span>
              <h2 className="text-lg font-semibold tracking-tight">{option.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">{option.description}</p>
              <span className="mt-7 flex items-center gap-2 text-sm font-medium text-violet-200">{option.action}<ArrowRight aria-hidden="true" className="h-4 w-4 transition group-hover:translate-x-1" /></span>
            </button>)}
          </div>
        </> : <div className="mx-auto w-full max-w-md">
          <button type="button" disabled={loading} onClick={() => selectStep('choose')} className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white disabled:opacity-50"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back</button>
          <section className="glass-panel rounded-[2rem] p-6 sm:p-8" aria-labelledby="org-setup-title">
            <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-400/10 text-violet-300"><Icon aria-hidden="true" className="h-6 w-6" /></span>
            <h1 id="org-setup-title" className="text-2xl font-semibold tracking-[-0.03em]">{step === 'join' ? 'Join your organization.' : 'A space for your team.'}</h1>
            <p className="mb-7 mt-3 text-sm leading-6 text-slate-400">{step === 'join' ? 'Enter the 4-digit invite code shared by your team.' : 'Give your organization a name. You can invite your team once it’s ready.'}</p>
            <form onSubmit={handleSubmit}>
              <fieldset disabled={loading} className="space-y-5 disabled:opacity-60">
                {step === 'join' ? <div>
                  <label htmlFor="org-code" className="mb-2 block text-sm font-medium text-slate-300">Organization code</label>
                  <input id="org-code" autoFocus type="text" inputMode="numeric" autoComplete="off" required pattern="[0-9]{4}" maxLength={4} value={joinCode} onChange={e => { setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }} placeholder="0000" aria-describedby="org-code-help" className={`${inputClass} text-center font-mono text-3xl tracking-[0.3em]`} />
                  <p id="org-code-help" className="mt-3 text-xs leading-5 text-slate-400">Need a code? Ask your organization’s owner or admin.</p>
                </div> : <div>
                  <label htmlFor="org-name" className="mb-2 block text-sm font-medium text-slate-300">Organization name</label>
                  <input id="org-name" autoFocus required maxLength={100} autoComplete="organization" value={orgName} onChange={e => { setOrgName(e.target.value); setError(''); }} placeholder="Your team’s name" className={inputClass} />
                </div>}
                {error && <p role="alert" className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-200">{error}</p>}
                <button type="submit" disabled={loading || (step === 'join' ? joinCode.length !== 4 : !orgName.trim())} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-300/20 bg-violet-600 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(139,92,246,0.2)] transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300">
                  {loading ? <><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />{step === 'join' ? 'Joining…' : 'Creating…'}</> : <>{step === 'join' ? 'Join organization' : 'Create organization'}<ArrowRight aria-hidden="true" className="h-4 w-4" /></>}
                </button>
              </fieldset>
            </form>
          </section>
        </div>}
      </main>
    </div>
  );
}
