import { useEffect, useRef, useState } from 'react';
import { Lightbulb, Pencil, Plus } from 'lucide-react';
import { FeaturePlanAttachment } from './FeaturePlanAttachment';
import { featureStatuses, listFeatureIdeas, saveFeatureIdea, type FeatureIdea, type FeatureInput, type FeatureStatus } from './adminFeatures';

const empty: FeatureInput = { title: '', notes: '', status: 'idea' };
export function AdminFeaturesPage({ refreshVersion }: { refreshVersion: number }) {
  const [rows, setRows] = useState<FeatureIdea[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FeatureInput>(empty);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    listFeatureIdeas(page, filter).then(result => {
      if (active) { setRows(result.rows); setTotal(result.total); if (page > 1 && !result.rows.length) setPage(page - 1); }
    }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Could not load ideas.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, filter, revision, refreshVersion]);
  async function save(values: FeatureInput, id?: string, closeEditor = false) {
    if (submitting.current) return;
    submitting.current = true; setSaving(true); setError(''); setNotice('');
    try {
      await saveFeatureIdea(values, id, !closeEditor);
      if (closeEditor) { setEditing(null); setForm(empty); }
      setRevision(v => v + 1); setNotice(id ? 'Feature updated.' : 'Idea added.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save this idea.'); }
    finally { submitting.current = false; setSaving(false); }
  }
  const button = 'rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-40';
  return <section className="max-w-4xl space-y-5" aria-label="Feature ideas">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-400">A shared list for admin ideas and what’s happening next.</p>
      <button className={`${button} inline-flex items-center gap-2 text-blue-200`} disabled={saving} onClick={() => { setEditing('new'); setForm(empty); }}><Plus className="h-4 w-4" />Add idea</button>
    </div>
    {editing && <form aria-label={editing === 'new' ? 'Add feature idea' : 'Edit feature idea'} className="space-y-3 rounded-xl border border-white/10 bg-slate-950/40 p-4" onSubmit={e => { e.preventDefault(); void save(form, editing === 'new' ? undefined : editing, true); }}>
      <label className="block text-sm">Title<input autoFocus required maxLength={160} disabled={saving} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 p-2" placeholder="What should we build?" /></label>
      <label className="block text-sm">Notes (optional)<textarea maxLength={2000} rows={3} disabled={saving} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 p-2" /></label>
      <label className="block text-sm">Status<select disabled={saving} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as FeatureStatus })} className="ml-3 rounded-lg bg-slate-900 p-2">{Object.entries(featureStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <div className="flex justify-end gap-2"><button type="button" className={button} disabled={saving} onClick={() => setEditing(null)}>Cancel</button><button className={`${button} bg-blue-500/10 text-blue-100`} disabled={saving || !form.title.trim()}>{saving ? 'Saving…' : 'Save idea'}</button></div>
    </form>}
    <label className="block text-sm text-slate-400">Show<select aria-label="Filter feature status" className="ml-3 rounded-lg bg-slate-900 p-2 text-slate-200" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}><option value="">All features</option>{Object.entries(featureStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    {error && <div role="alert" className="text-sm text-red-200">{error}<button className="ml-3 underline" onClick={() => setRevision(v => v + 1)}>Retry loading</button></div>}
    {notice && <p role="status" className="text-sm text-emerald-200">{notice}</p>}
    {loading ? <p className="text-sm text-slate-400">Loading ideas…</p> : <>
      <div className="space-y-3">{rows.map(idea => <article key={idea.id} className="flex flex-wrap items-start gap-3 rounded-xl border border-white/10 bg-slate-950/35 p-4">
        <Lightbulb className={`mt-1 h-4 w-4 shrink-0 ${idea.status === 'completed' ? 'text-emerald-300' : idea.status === 'in_progress' ? 'text-blue-300' : 'text-amber-200'}`} />
        <div className="min-w-0 flex-1"><h2 className="break-words font-medium">{idea.title}</h2>{idea.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-400">{idea.notes}</p>}<FeaturePlanAttachment ideaId={idea.id} title={idea.title} initialName={idea.plan_name} /></div>
        <select aria-label={`Status for ${idea.title}`} disabled={saving || editing === idea.id} value={idea.status} onChange={e => { void save({ title: idea.title, notes: idea.notes, status: e.target.value as FeatureStatus }, idea.id); }} className="rounded-lg border border-white/10 bg-slate-900 p-2 text-sm">{Object.entries(featureStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <button className={button} aria-label={`Edit ${idea.title}`} disabled={saving} onClick={() => { setEditing(idea.id); setForm({ title: idea.title, notes: idea.notes, status: idea.status }); }}><Pencil className="h-4 w-4" /></button>
      </article>)}</div>
      {!rows.length && !error && <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">{filter ? 'No features with this status.' : 'No ideas yet. Add the first one.'}</p>}
      {total > 50 && <div className="flex items-center justify-end gap-3 text-sm text-slate-400"><button className={button} disabled={page === 1} onClick={() => setPage(v => v - 1)}>Previous</button><span>Page {page} of {Math.ceil(total / 50)}</span><button className={button} disabled={page * 50 >= total} onClick={() => setPage(v => v + 1)}>Next</button></div>}
    </>}
  </section>;
}
