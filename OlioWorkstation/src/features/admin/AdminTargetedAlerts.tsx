import { useEffect, useState } from 'react';
import { loadAdminResource } from './api';
import { AdminOperationDialog } from './AdminOperationDialog';
import { BannerMessage } from '../../components/BannerMessage';
import { bannerStatus } from '../../lib/banner';
import type { AdminOperation, AdminRow } from './types';

const field = 'w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-sm';
type Recipient = { id: string; label: string; kind: 'users' | 'organizations' };

export function AdminTargetedAlerts() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [revision, setRevision] = useState(0);
  const [kind, setKind] = useState<Recipient['kind']>('users');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<AdminRow[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [message, setMessage] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [operation, setOperation] = useState<Omit<AdminOperation, 'reason'> | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    loadAdminResource({ resource: 'dashboard-alerts', page, pageSize: 20, search: '' }).then(result => {
      if (!cancelled) { setRows(result.rows); setTotal(result.total); }
    }).catch(cause => { if (!cancelled) setError(cause.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, revision]);
  useEffect(() => {
    let cancelled = false;
    setResults([]); setSearchError(''); setSearching(true);
    const timer = window.setTimeout(() => {
      loadAdminResource({ resource: kind, page: 1, pageSize: 20, search }).then(result => {
        if (!cancelled) setResults(result.rows);
      }).catch(cause => { if (!cancelled) setSearchError(cause.message); }).finally(() => { if (!cancelled) setSearching(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, kind]);
  const invalidSchedule = Boolean((start && !Number.isFinite(Date.parse(start))) || (end && !Number.isFinite(Date.parse(end))) || (start && end && Date.parse(end) <= Date.parse(start)));
  return <section className="mt-10 space-y-4 rounded-2xl border border-white/10 bg-slate-900/50 p-6">
    <h2 className="text-lg font-semibold">Targeted alerts</h2>
    <p className="text-sm text-slate-400">Send a separate banner to one user, a selected group of users, or everyone in selected organizations. Organization alerts follow current membership. Alerts appear within 30 seconds.</p>
    <label className="block text-sm">Alert message<textarea className={field + ' mt-2'} value={message} maxLength={5000} onChange={e => setMessage(e.target.value)} rows={3} /></label>
    <div className="grid gap-3 sm:grid-cols-2"><label>Recipient type<select className={field} value={kind} onChange={e => setKind(e.target.value as Recipient['kind'])}><option value="users">Users</option><option value="organizations">Organizations</option></select></label><label>Find recipients<input className={field} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email" /></label></div>
    {searchError && <p role="alert" className="text-red-300">{searchError}</p>}
    <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 p-3">{searching ? <p role="status">Finding recipients…</p> : results.length === 0 ? <p>No matches.</p> : results.map(row => {
      const label = String(row.display_name || row.name || row.email || row._admin_id) + (row.display_name && row.email ? ` (${row.email})` : '');
      const selected = recipients.some(r => r.id === row._admin_id && r.kind === kind);
      return <label key={row._admin_id} className="flex items-center gap-3 py-2 text-sm"><input type="checkbox" checked={selected} onChange={e => setRecipients(current => e.target.checked ? [...current, { id: row._admin_id, label, kind }] : current.filter(r => r.id !== row._admin_id || r.kind !== kind))} />{label}</label>;
    })}</div>
    <p className="text-xs text-slate-400">Showing up to 20 matches. Refine your search to find more recipients.</p>
    <div className="flex flex-wrap gap-2">{recipients.map(r => <button key={r.kind + r.id} onClick={() => setRecipients(current => current.filter(item => item !== r))} className="rounded-lg bg-blue-500/20 px-3 py-2 text-sm" aria-label={`Remove ${r.label}`}>{r.label} ×</button>)}</div>
    <div className="grid gap-3 sm:grid-cols-2"><label>Alert start (optional)<input type="datetime-local" className={field} value={start} onChange={e => setStart(e.target.value)} /></label><label>Alert end (optional)<input type="datetime-local" className={field} value={end} onChange={e => setEnd(e.target.value)} /></label></div>
    <p className="text-xs text-slate-400">Times use {Intl.DateTimeFormat().resolvedOptions().timeZone}. Leave blank to start immediately or show until disabled.</p>
    {invalidSchedule && <p role="alert">Choose valid times with the end after the start.</p>}
    {message && <div className="rounded-xl bg-amber-400/10 p-4 text-amber-100"><BannerMessage text={message} /></div>}
    <button className="rounded-lg bg-blue-500 px-4 py-2 disabled:opacity-40" disabled={!message.trim() || !recipients.length || invalidSchedule || !!operation || loading || !!error} onClick={() => setOperation({ resource: 'dashboard-alerts', kind: 'create', values: { message: message.trim(), enabled: true, user_ids: recipients.filter(r => r.kind === 'users').map(r => r.id), org_ids: recipients.filter(r => r.kind === 'organizations').map(r => r.id), starts_at: start ? new Date(start).toISOString() : null, ends_at: end ? new Date(end).toISOString() : null } })}>Send targeted alert</button>
    <h3 className="pt-4 font-semibold">Sent and scheduled alerts</h3>
    {error && <p role="alert" className="text-red-300">{error}<button className="ml-3 underline" onClick={() => setRevision(r => r + 1)}>Retry</button></p>}
    {loading ? <p role="status">Loading alerts…</p> : rows.map(row => <div key={row._admin_id} className="space-y-2 rounded-xl border border-white/10 p-4"><BannerMessage text={String(row.message)} /><p className="text-xs text-slate-400">{bannerStatus({ enabled: row.enabled === true, text: String(row.message), startsAt: row.starts_at as string | null, endsAt: row.ends_at as string | null })} · {(row.user_ids as string[]).length} users · {(row.org_ids as string[]).length} organizations</p><button className="text-sm text-blue-300" disabled={!!operation} onClick={() => setOperation({ resource: 'dashboard-alerts', kind: 'update', ids: [row._admin_id], values: { enabled: !row.enabled } })}>{row.enabled ? 'Disable alert' : 'Enable alert'}</button></div>)}
    {!loading && !error && !rows.length && <p className="text-sm text-slate-400">No alerts yet.</p>}
    <div className="flex gap-4"><button disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page}</span><button disabled={page * 20 >= total || loading} onClick={() => setPage(p => p + 1)}>Next</button></div>
    <AdminOperationDialog operation={operation} title="Save targeted alert" onCancel={() => setOperation(null)} onComplete={() => { if (operation?.kind === 'create') { setMessage(''); setRecipients([]); setStart(''); setEnd(''); } setOperation(null); setRevision(r => r + 1); window.dispatchEvent(new Event('olio-banner-updated')); }} />
  </section>;
}
