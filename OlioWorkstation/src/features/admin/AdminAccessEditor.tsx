import { useEffect, useState } from 'react';
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
  const items = catalog.catalog.filter(item => !item.ownerOnly);
  function apply(keys: string[], level: string, leaf = false) {
    setPreset('custom');
    setGrants(current => [...new Set([...current.filter(key => !keys.includes(key)), ...items.filter(item => keys.includes(item.key) && level !== 'hidden' && (level === 'full' || (!item.write && (leaf || !item.protected)))).map(item => item.key)])]);
  }
  const level = (keys: string[]) => keys.every(key => !grants.includes(key)) ? 'hidden' : keys.every(key => grants.includes(key)) ? 'full' : keys.filter(key => !items.find(item => item.key === key)?.write && !items.find(item => item.key === key)?.protected).every(key => grants.includes(key)) && keys.filter(key => items.find(item => item.key === key)?.write || items.find(item => item.key === key)?.protected).every(key => !grants.includes(key)) ? 'view' : 'mixed';
  const select = (label: string, keys: string[], immutable = false) => <label className="flex items-center justify-between gap-4 py-2"><span>{label}</span><select aria-label={label} className="rounded bg-slate-800 p-2" value={immutable && keys.every(key => grants.includes(key)) ? "view" : level(keys)} onChange={event => apply(keys, event.target.value, keys.some(key => key.includes(".fields.")) && keys.length <= 2)}><option value="hidden">Hidden</option><option value="view">View-only</option>{!immutable && <option value="full">Full control</option>}<option value="mixed" disabled>Mixed</option></select></label>;
  const dependencies = grants.filter(key => { const item = items.find(item => item.key === key); return (item?.parent && !grants.includes(item.parent)) || (key === 'users.background-write' && !grants.includes('users.background-view')); });
  const added = grants.filter(key => !saved.permissions.includes(key));
  const removed = saved.permissions.filter(key => !grants.includes(key));
  return <section id="admin-access-editor" className="rounded-2xl border border-blue-400/25 bg-slate-950/50 p-5 space-y-4">
    <h3 className="text-lg font-semibold">Admin access</h3>
    <p>Current access: {saved.preset}. Revision {saved.revision}.{saved.updated_at && ` Last changed ${new Date(saved.updated_at).toLocaleString()} by ${saved.updated_by || 'migration'}.`}</p>
    <label className="block">Access level <select className="ml-3 rounded bg-slate-800 p-2" value={preset} onChange={event => { setPreset(event.target.value); setGrants(catalog.presets[event.target.value] || []); }}><option value="standard">Standard account</option><option value="read-only">Read-only admin</option><option value="custom">Custom admin</option><option value="full">Full admin</option></select></label>
    <p className="text-sm text-slate-400">Read-only includes ordinary account details. Custom begins with no grants. Group changes apply to current descendants. Parents cap child access; future permissions remain hidden.</p>
    {preset === 'custom' && items.filter(item => item.key.startsWith('sections.') && item.key.endsWith('.read')).map(section => {
      const resourceKeys = items.filter(item => item.parent === section.key && !item.key.startsWith('sections.')).map(item => item.key.replace(/\.read$/, ''));
      const keys = items.filter(item => item.key.startsWith(section.key.replace(/\.read$/, '.')) || resourceKeys.some(key => item.key.startsWith(key + '.'))).map(item => item.key);
      return <details key={section.key} className="rounded border border-white/10 p-3"><summary>{section.key.split('.')[1]} — {level(keys)}</summary>{select('Apply to section and descendants', keys)}{resourceKeys.map(resource => {
        const children = items.filter(item => item.key.startsWith(resource + '.'));
        return <details key={resource} className="ml-3 border-t border-white/10 p-2"><summary>{items.find(item => item.key === resource + '.read')?.label} — {level(children.map(item => item.key))}</summary>{select('Apply to resource and descendants', children.map(item => item.key), !children.some(item => item.write && !item.key.endsWith('.control')))}{children.filter(item => item.key.includes('.fields.') && item.key.endsWith('.read')).map(field => select(field.label, children.filter(item => item.key.startsWith(field.key.replace(/\.read$/, '.'))).map(item => item.key), !children.some(item => item.key === field.key.replace(/\.read$/, '.update'))))}{children.filter(item => !item.key.includes('.fields.') && !item.key.endsWith('.read') && !item.key.endsWith('.control')).map(action => select(action.label, [action.key], false))}</details>;
      })}</details>;
    })}
    {!!dependencies.length && <p role="alert" className="text-amber-200">Enable parent permissions or hide these children: {dependencies.join(', ')}</p>}
    {items.filter(item => grants.includes(item.key) && item.requires?.some(key => !grants.includes(key))).map(item => <p key={item.key} className="text-amber-200">Create is unavailable for {item.key.split('.')[0]} until these required fields can be edited: {item.requires?.filter(key => !grants.includes(key)).join(', ')}.</p>)}
    <details><summary>Review changes: {added.length} granted, {removed.length} removed</summary><p>Before: {saved.preset}; after: {preset}</p><ul>{added.map(key => <li key={key}>Grant {key}</li>)}{removed.map(key => <li key={key}>Remove {key}</li>)}</ul></details>
    <button disabled={!!dependencies.length} className="rounded bg-blue-600 px-4 py-2 disabled:opacity-40" onClick={() => setOperation({ resource: 'users', kind: saved.preset === 'standard' && preset !== 'standard' ? 'request-admin' : 'set-access', ids: [userId], values: { preset, permissions: grants, revision: saved.revision } })}>Review access change</button>
    {error && <p role="alert">{error}</p>}
    <AdminOperationDialog operation={operation} title="Confirm admin access change" onCancel={() => setOperation(null)} onComplete={() => { setOperation(null); refresh(value => value + 1); }} />
  </section>;
}
