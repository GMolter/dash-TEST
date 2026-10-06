import { useEffect, useRef, useState } from 'react';
import { CalendarClock, Megaphone, Pencil, Plus, X } from 'lucide-react';
import { loadAdminResource } from './api';
import { AdminOperationDialog } from './AdminOperationDialog';
import { AlertBanner } from '../../components/AlertBanner';
import { bannerStatus, toLocalDateTime } from '../../lib/banner';
import { TargetedBannerFields } from './TargetedBannerFields';
import { bannerValues, emptyBanner, invalidBannerSchedule, type BannerDraft } from './bannerDraft';
import type { AdminOperation, AdminRow } from './types';

const field = 'mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 p-3 text-sm outline-none focus:border-blue-400';
const primary = 'inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-400 disabled:opacity-40';
type Recipient = { id: string; label: string; kind: 'users' | 'organizations' };

export function AdminTargetedAlerts({ recipient, onSent, refreshVersion = 0 }: { recipient?: { id: string; label: string }; onSent?: () => void; refreshVersion?: number }) {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState<'live' | 'scheduled'>('live');
  const [composing, setComposing] = useState(false);
  const [kind, setKind] = useState<Recipient['kind']>('users');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<AdminRow[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [draft, setDraft] = useState<BannerDraft>(emptyBanner);
  const [editing, setEditing] = useState<{ id: string; draft: BannerDraft } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [operation, setOperation] = useState<Omit<AdminOperation, 'reason'> | null>(null);
  const editor = useRef<HTMLDivElement>(null);
  const selectedRecipients: Recipient[] = recipient ? [{ ...recipient, kind: 'users' }] : recipients;
  const editingId = editing?.id;

  useEffect(() => {
    if (recipient) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setError('');
    loadAdminResource({ resource: 'dashboard-alerts', page, pageSize: 20, search: '', bannerView: view }).then(result => {
      if (!cancelled) {
        if (page > 1 && !result.rows.length) { setPage(page - 1); return; }
        setRows(result.rows); setTotal(result.total);
      }
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load banners.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, revision, recipient, view, refreshVersion]);

  useEffect(() => {
    if (recipient || !composing) return;
    let cancelled = false;
    setResults([]); setSearchError(''); setSearching(true);
    const timer = window.setTimeout(() => {
      loadAdminResource({ resource: kind, page: 1, pageSize: 20, search }).then(result => {
        if (!cancelled) setResults(result.rows);
      }).catch(cause => { if (!cancelled) setSearchError(cause.message); }).finally(() => { if (!cancelled) setSearching(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, kind, recipient, composing]);

  useEffect(() => {
    if (editingId || composing) editor.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, [editingId, composing]);

  useEffect(() => {
    if (recipient || editingId || composing || operation) return;
    const timer = window.setInterval(() => setRevision(value => value + 1), 30000);
    return () => clearInterval(timer);
  }, [recipient, editingId, composing, operation]);

  const visibleRows = rows.filter(row => bannerStatus({ enabled: row.enabled === true, text: String(row.message || ''), startsAt: row.starts_at as string | null, endsAt: row.ends_at as string | null }) === (view === 'live' ? 'Live' : 'Scheduled') || editingId === row._admin_id);

  return <section className="space-y-5">
    {!recipient && <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h2 className="text-lg font-semibold">Targeted banners</h2><p className="mt-1 text-sm text-slate-400">Messages for selected people and organizations.</p></div>
      <button className={primary} disabled={!!operation} onClick={() => { setComposing(!composing); setEditing(null); setNotice(''); }}>{composing ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{composing ? 'Close composer' : 'New targeted banner'}</button>
    </div>}
    {notice && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">{notice}</p>}
    {(recipient || composing) && <div ref={editor} className="space-y-5 rounded-2xl border border-blue-400/25 bg-slate-900/60 p-5 sm:p-6">
      <div><h3 className="font-semibold">{recipient ? 'Send a banner' : 'New targeted banner'}</h3><p className="mt-1 text-sm text-slate-400">{recipient ? <>Only <strong className="text-slate-200">{recipient.label}</strong> will receive this banner.</> : 'Choose your audience, write a message, and review before sending.'}</p></div>
      <TargetedBannerFields draft={draft} onChange={setDraft} />
      {!recipient && <div className="space-y-3 border-t border-white/10 pt-5">
        <h4 className="text-sm font-medium">Audience <span className="ml-2 text-slate-400">{recipients.length} selected</span></h4>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-slate-300">Recipient type<select className={field} value={kind} onChange={e => setKind(e.target.value as Recipient['kind'])}><option value="users">Users</option><option value="organizations">Organizations</option></select></label><label className="text-sm text-slate-300">Find recipients<input className={field} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email" /></label></div>
        {searchError && <p role="alert" className="text-sm text-red-300">{searchError}</p>}
        <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 px-4 py-2">{searching ? <p role="status" className="py-2 text-sm text-slate-400">Finding recipients…</p> : results.length === 0 ? <p className="py-2 text-sm text-slate-400">No matches.</p> : results.map(row => {
          const label = String(row.display_name || row.name || row.email || row._admin_id) + (row.display_name && row.email ? ` (${row.email})` : '');
          const selected = recipients.some(r => r.id === row._admin_id && r.kind === kind);
          return <label key={row._admin_id} className="flex items-center gap-3 py-2 text-sm"><input type="checkbox" checked={selected} onChange={e => setRecipients(current => e.target.checked ? [...current, { id: row._admin_id, label, kind }] : current.filter(r => r.id !== row._admin_id || r.kind !== kind))} />{label}</label>;
        })}</div>
        <p className="text-xs text-slate-400">Showing up to 20 matches. Organization banners follow current membership.</p>
        <div className="flex flex-wrap gap-2">{recipients.map(r => <button key={r.kind + r.id} onClick={() => setRecipients(current => current.filter(item => item !== r))} className="rounded-lg bg-blue-500/20 px-3 py-2 text-sm" aria-label={`Remove ${r.label}`}>{r.label} ×</button>)}</div>
      </div>}
      <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4"><button className={primary} disabled={!draft.message.trim() || !selectedRecipients.length || invalidBannerSchedule(draft) || !!operation} onClick={() => setOperation({ resource: 'dashboard-alerts', kind: 'create', values: { ...bannerValues(draft), enabled: true, user_ids: selectedRecipients.filter(r => r.kind === 'users').map(r => r.id), org_ids: selectedRecipients.filter(r => r.kind === 'organizations').map(r => r.id) } })}>Send targeted alert</button><span className="text-xs text-slate-400">Dashboard updates within 30 seconds.</span></div>
    </div>}
    {!recipient && <>
      <div className="flex gap-1 border-b border-white/10" aria-label="Banner lists">{(['live', 'scheduled'] as const).map(item => <button key={item} aria-pressed={view === item} disabled={!!operation} onClick={() => { setView(item); setPage(1); setEditing(null); }} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm ${view === item ? 'border-blue-400 text-blue-200' : 'border-transparent text-slate-400 hover:text-white'}`}>{item === 'live' ? <Megaphone className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}{item === 'live' ? 'Active banners' : 'Scheduled'}</button>)}</div>
      {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}<button className="ml-3 underline" onClick={() => setRevision(r => r + 1)}>Retry</button></p>}
      {loading && !editing ? <p role="status" className="py-6 text-sm text-slate-400">Loading banners…</p> : !error && visibleRows.map(row => <article key={row._admin_id} aria-label={String(row.title || 'Targeted banner')} className={`overflow-hidden rounded-2xl border ${editingId === row._admin_id ? 'border-blue-400/40' : 'border-white/10'} bg-slate-900/40`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
          <p className="text-xs text-slate-400"><span className={view === 'live' ? 'text-emerald-300' : 'text-amber-200'}>{view === 'live' ? 'Live' : 'Scheduled'}</span> · {(row.user_ids as string[] || []).length} users · {(row.org_ids as string[] || []).length} organizations</p>
          <div className="flex gap-4"><button disabled={!!operation} className="inline-flex items-center gap-1.5 text-sm text-blue-300" onClick={() => { setComposing(false); setEditing(editingId === row._admin_id ? null : { id: row._admin_id, draft: { title: String(row.title || ''), color: String(row.color || '#fbbf24'), message: String(row.message || ''), start: toLocalDateTime(row.starts_at as string | null), end: toLocalDateTime(row.ends_at as string | null) } }); }}><Pencil className="h-3.5 w-3.5" />{editingId === row._admin_id ? 'Close editor' : 'Edit banner'}</button><button className="text-sm text-slate-300 hover:text-red-200" disabled={!!operation} onClick={() => setOperation({ resource: 'dashboard-alerts', kind: 'update', ids: [row._admin_id], values: { enabled: false } })}>Disable alert</button></div>
        </div>
        {editing?.id === row._admin_id ? <div ref={editor} className="space-y-5 p-5 sm:p-6">
          <h3 className="font-semibold">Edit banner</h3>
          <TargetedBannerFields draft={editing.draft} onChange={draft => setEditing({ id: row._admin_id, draft })} />
          <div className="flex gap-3"><button className={primary} disabled={!!operation || !editing.draft.message.trim() || invalidBannerSchedule(editing.draft)} onClick={() => setOperation({ resource: 'dashboard-alerts', kind: 'update', ids: [row._admin_id], values: bannerValues(editing.draft) })}>Save changes</button><button disabled={!!operation} className="px-3 text-sm text-slate-300" onClick={() => setEditing(null)}>Cancel edit</button></div>
        </div> : <div className="space-y-3 p-5"><AlertBanner title={String(row.title || '')} color={String(row.color || '')} message={String(row.message || '')} />{Boolean(row.starts_at || row.ends_at) && <p className="text-xs text-slate-400">{row.starts_at ? `Starts ${new Date(String(row.starts_at)).toLocaleString()}` : 'Started immediately'} · {row.ends_at ? `Ends ${new Date(String(row.ends_at)).toLocaleString()}` : 'No end date'}</p>}</div>}
      </article>)}
      {!loading && !error && !visibleRows.length && <div className="rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center"><Megaphone className="mx-auto mb-3 h-6 w-6 text-slate-500" /><h3 className="font-medium">{view === 'live' ? 'No active targeted banners' : 'No scheduled banners'}</h3><p className="mt-2 text-sm text-slate-400">{view === 'live' ? 'Create a banner when you have something to share.' : 'Set a future start time when creating a banner.'}</p></div>}
      {total > 20 && <div className="flex items-center justify-between text-sm text-slate-400"><button disabled={page === 1 || loading || !!operation} onClick={() => { setEditing(null); setPage(p => p - 1); }}>Previous</button><span>Page {page} of {Math.ceil(total / 20)}</span><button disabled={page * 20 >= total || loading || !!operation} onClick={() => { setEditing(null); setPage(p => p + 1); }}>Next</button></div>}
    </>}
    <AdminOperationDialog operation={operation} title="Save targeted alert" onCancel={() => setOperation(null)} onComplete={() => {
      if (operation?.kind === 'create') { setDraft(emptyBanner()); setRecipients([]); setComposing(false); setView(draft.start && Date.parse(draft.start) > Date.now() ? 'scheduled' : 'live'); setPage(1); }
      setOperation(null); setEditing(null); setNotice('Banner saved. Dashboard updates within 30 seconds.'); setRevision(r => r + 1); window.dispatchEvent(new Event('olio-banner-updated')); onSent?.();
    }} />
  </section>;
}
