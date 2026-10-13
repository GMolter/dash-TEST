import { useEffect, useState } from 'react';
import { Search, Check, X, Users } from 'lucide-react';
import { emailApi } from './emailApi';
type Person = { id: string; email: string; display_name: string };
export function EmailRecipients({ value, onChange, disabled }: { value: string[]; onChange: (value: string[]) => void; disabled: boolean }) {
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [organization, setOrganization] = useState('');
  const [loading, setLoading] = useState(false);
  const [groupBusy, setGroupBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      emailApi('recipients', { search: query }).then(data => {
        if (!active) return;
        setPeople(data.users || []);
        setOrganizations(data.organizations || []);
        setError('');
      }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);
  function add(addresses: string[]) {
    const normalized = addresses.map(address => address.trim().toLowerCase()).filter(Boolean);
    if (normalized.some(address => !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address))) {
      setError('Enter valid email addresses separated by commas.'); return;
    }
    const next = [...new Set([...value, ...normalized])];
    if (next.length > 50) { setError('Choose up to 50 recipients per message.'); return; }
    setError(''); onChange(next);
  }
  async function addGroup(group: string) {
    setGroupBusy(true); setError('');
    try { const data = await emailApi('recipients', { group, organization }); add(data.users.map((person: Person) => person.email)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load recipients.'); }
    finally { setGroupBusy(false); }
  }
  const locked = disabled || groupBusy;
  return <aside className="rounded-2xl border border-white/10 bg-slate-900/70 p-5" aria-label="Message recipients">
    <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4 text-blue-300" />Recipients</h3><span className="text-xs text-slate-400">{value.length} / 50</span></div>
    <p className="mt-2 text-xs leading-5 text-slate-400">Each person receives a separate email.</p>
    <div className="my-4 flex min-h-12 flex-wrap gap-2 rounded-xl border border-dashed border-white/15 p-3">
      {!value.length && <span className="self-center text-xs text-slate-500">Add people to your message below.</span>}
      {value.map(email => <button disabled={locked} key={email} aria-label={`Remove ${email}`} onClick={() => onChange(value.filter(item => item !== email))} className="flex max-w-full items-center gap-2 rounded-lg bg-blue-400/10 px-2 py-1.5 text-xs text-blue-200"><span className="truncate">{email}</span><X className="h-3 w-3 shrink-0" /></button>)}
    </div>
    <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-slate-950/60 px-3 focus-within:border-blue-400"><Search className="h-4 w-4 shrink-0 text-slate-500" /><input disabled={locked} aria-label="Find registered users" placeholder="Name or email address" value={query} onChange={e => setQuery(e.target.value)} className="min-w-0 w-full bg-transparent py-3 text-sm outline-none" onKeyDown={e => { if (e.key === 'Enter' && query.includes('@')) { e.preventDefault(); add(query.split(/[,;\s]+/)); } }} /></label>
    {query.includes('@') && <button disabled={locked} onClick={() => add(query.split(/[,;\s]+/))} className="mt-2 w-full rounded-lg bg-blue-500/15 p-2 text-sm text-blue-200">Add entered address{query.includes(',') ? 'es' : ''}</button>}
    <div className="mt-3 max-h-64 overflow-y-auto" aria-live="polite">
      {loading ? <p className="p-3 text-sm text-slate-400">Searching people…</p> : !people.length ? <p className="p-3 text-sm text-slate-400">No matching people. Enter an email address to add someone directly.</p> : people.map(person => {
        const selected = value.includes(person.email.toLowerCase());
        return <button disabled={locked || selected} key={person.id} onClick={() => add([person.email])} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-white/5 disabled:opacity-60"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs text-blue-200">{(person.display_name || person.email).slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm">{person.display_name || person.email}</span><span className="block truncate text-xs text-slate-400">{person.email}</span></span>{selected && <Check aria-label="Selected" className="h-4 w-4 text-blue-300" />}</button>;
      })}
    </div>
    <details className="mt-4 border-t border-white/10 pt-4"><summary className="cursor-pointer text-sm text-slate-300">Add a group</summary><div className="mt-3 space-y-2"><select disabled={locked} aria-label="Recipient organization" value={organization} onChange={e => setOrganization(e.target.value)} className="w-full rounded-lg bg-slate-800 p-2 text-sm"><option value="">Choose organization</option>{organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select><button disabled={locked || !organization} onClick={() => void addGroup('organization')} className="w-full rounded-lg border border-white/10 p-2 text-sm disabled:opacity-40">Add organization members</button><button disabled={locked} onClick={() => void addGroup('all')} className="w-full p-2 text-sm text-blue-300">Add all users (up to 50)</button></div></details>
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
  </aside>;
}
