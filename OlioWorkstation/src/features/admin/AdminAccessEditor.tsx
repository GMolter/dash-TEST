import { useEffect, useState } from 'react';
import { AdminPermissionPicker } from './AdminPermissionPicker';
import { adminFetch } from './api';
import { AdminOperationDialog } from './AdminOperationDialog';
import type { AdminOperation } from './types';
type Item = { key: string; label: string; parent?: string; write: boolean; protected?: boolean; ownerOnly?: boolean; requires?: string[] };
type Catalog = { enabled: boolean; version: number; catalog: Item[]; presets: Record<string, string[]> };
type Assignment = { preset: string; revision: number; permissions: string[]; updated_at?: string; updated_by?: string };
export function AdminAccessEditor({ userId }: { userId: string }) {
  const [catalog, setCatalog] = useState<Catalog>();
  const [saved, setSaved] = useState<Assignment>();
  const [preset, setPreset] = useState('read-only');
  const [grants, setGrants] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [operation, setOperation] = useState<Omit<AdminOperation, 'reason'> | null>(null);
  const [version, refresh] = useState(0);
  useEffect(() => {
    let cancelled = false;
    Promise.all([adminFetch('/api/admin/data?resource=permission-catalog'), adminFetch(`/api/admin/data?resource=permission-assignment&userId=${encodeURIComponent(userId)}`)]).then(([nextCatalog, assignment]) => {
      if (cancelled) return;
      setCatalog(nextCatalog); setSaved(assignment); setPreset(assignment.preset === 'standard' ? 'read-only' : assignment.preset); setGrants(assignment.preset === 'standard' ? nextCatalog.presets['read-only'] : assignment.permissions);
    }).catch(error => { if (!cancelled) setError(error.message); });
    return () => { cancelled = true; };
  }, [userId, version]);
  if (!catalog || !saved) return <div role="status">{error || 'Loading admin access…'}</div>;
  if (!catalog.enabled) return <section className="rounded border border-white/10 p-4"><h3>Admin access</h3><p>Permission assignment is disabled until rollout verification completes.</p></section>;
  const added = grants.filter(key => !saved.permissions.includes(key));
  const removed = saved.permissions.filter(key => !grants.includes(key));
  return <section id="admin-access-editor" className="rounded-2xl border border-white/10 bg-slate-950/35 p-5 space-y-4">
    <div><h3 className="text-sm font-semibold text-white">Administrator permissions</h3><p className="mt-1 text-xs text-slate-400">Choose which areas of Olio this person can manage.</p></div>
    <p className="text-xs text-slate-400">Current access: <span className="capitalize text-slate-200">{saved.preset.replace(/-/g, " ")}</span>{saved.updated_at && ` · Updated ${new Date(saved.updated_at).toLocaleDateString()}`}</p>
    <AdminPermissionPicker catalog={catalog} value={{ preset, permissions: grants }} allowStandard onChange={next => { setPreset(next.preset); setGrants(next.permissions); }} />    <details className="text-xs text-slate-400"><summary className="cursor-pointer">Review changes: {added.length} granted, {removed.length} removed</summary><p>Before: {saved.preset}; after: {preset}</p><ul>{added.map(key => <li key={key}>Grant {key}</li>)}{removed.map(key => <li key={key}>Remove {key}</li>)}</ul></details>
    <button disabled={saved.preset === preset && !added.length && !removed.length} className="rounded-xl border border-blue-400/30 bg-blue-500/15 px-4 py-2 text-sm font-medium text-blue-100 hover:bg-blue-500/20 disabled:opacity-40" onClick={() => setOperation({ resource: 'users', kind: saved.preset === 'standard' && preset !== 'standard' ? 'request-admin' : 'set-access', ids: [userId], values: { preset, permissions: grants, revision: saved.revision } })}>Review access change</button>
    {error && <p role="alert">{error}</p>}
    <AdminOperationDialog operation={operation} title="Confirm admin access change" onCancel={() => setOperation(null)} onComplete={() => { setOperation(null); refresh(value => value + 1); }} />
  </section>;
}
