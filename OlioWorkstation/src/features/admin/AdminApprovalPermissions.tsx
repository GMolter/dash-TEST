import { useEffect, useState } from 'react';
import { adminFetch } from './api';

type Item = { key: string; label: string; parent?: string; ownerOnly?: boolean };
type Catalog = { enabled: boolean; catalog: Item[]; presets: Record<string, string[]> };
export type ApprovalPermissions = { preset: string; permissions: string[]; revision: number };

export function AdminApprovalPermissions({ requestId, disabled, onChange }: {
  requestId: string; disabled: boolean; onChange: (choice: ApprovalPermissions | null | undefined) => void;
}) {
  const [catalog, setCatalog] = useState<Catalog>();
  const [choice, setChoice] = useState<ApprovalPermissions>();
  const [deletion, setDeletion] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    onChange(undefined);
    setCatalog(undefined); setChoice(undefined); setDeletion(false); setError('');
    async function load() {
      const result = await adminFetch(`/api/admin/data?resource=admin-access-requests&record=${encodeURIComponent(requestId)}`);
      const request = result.rows?.[0];
      if (!request) throw new Error('Pending request could not be loaded.');
      if (request.request_kind === 'account_deletion') {
        if (!cancelled) { setDeletion(true); onChange(null); }
        return;
      }
      const [nextCatalog, assignment] = await Promise.all([
        adminFetch('/api/admin/data?resource=permission-catalog'),
        adminFetch(`/api/admin/data?resource=permission-assignment&userId=${encodeURIComponent(request.target_user_id)}`),
      ]);
      if (cancelled) return;
      if (!nextCatalog.enabled) throw new Error('Enable permission assignments in your deployment before approving admin access.');
      const preset = ['read-only', 'custom', 'full'].includes(request.proposed_preset) ? request.proposed_preset : 'read-only';
      const next = { preset, permissions: request.proposed_grants || nextCatalog.presets[preset], revision: assignment.revision };
      setCatalog(nextCatalog); setChoice(next); onChange(next);
    }
    load().catch(error => { if (!cancelled) setError(error.message); });
    return () => { cancelled = true; };
  }, [requestId, onChange]);
  if (deletion) return null;
  if (error) return <p role="alert" className="text-red-200">{error}</p>;
  if (!catalog || !choice) return <p role="status">Loading permission choices…</p>;
  const items = catalog.catalog.filter(item => !item.ownerOnly);
  function update(next: ApprovalPermissions) { setChoice(next); onChange(next); }
  function dependencies(key: string): string[] {
    const item = items.find(item => item.key === key);
    const resource = key.split('.')[0];
    return [...new Set([
      ...(item?.parent ? [item.parent] : []),
      ...(resource !== 'sections' && key !== `${resource}.read` ? [`${resource}.read`] : []),
      ...(key.includes('.fields.') && key.endsWith('.update') ? [key.replace(/\.update$/, '.read')] : []),
      ...(key === 'users.background-write' ? ['users.background-view'] : []),
    ])];
  }
  function toggle(key: string, checked: boolean) {
    const selected = new Set(choice!.permissions);
    function add(value: string) { if (selected.has(value)) return; selected.add(value); dependencies(value).forEach(add); }
    if (checked) add(key);
    else {
      selected.delete(key);
      let changed = true;
      while (changed) { changed = false; for (const value of selected) if (dependencies(value).some(parent => !selected.has(parent))) { selected.delete(value); changed = true; } }
    }
    update({ ...choice!, preset: 'custom', permissions: [...selected] });
  }
  return <fieldset disabled={disabled} className="space-y-3 rounded-xl border border-blue-400/30 bg-blue-400/5 p-4">
    <legend className="px-2 font-semibold text-white">Admin permissions</legend>
    <label className="block text-sm text-slate-200">Access level
      <select className="mt-2 block w-full rounded-lg bg-slate-800 p-2" value={choice.preset} onChange={event => update({ ...choice, preset: event.target.value, permissions: catalog.presets[event.target.value] || [] })}>
        <option value="read-only">Read-only admin</option><option value="full">Full admin</option><option value="custom">Custom permissions</option>
      </select>
    </label>
    <p className="text-xs text-slate-400">Full admin excludes owner-only actions. Custom lets you select individual permissions; required parent access is included automatically.</p>
    {choice.preset === 'custom' && <div className="max-h-60 overflow-y-auto">{[...new Set(items.map(item => item.key.split('.')[0]))].map(group => <details key={group} className="border-t border-white/10 py-2">
      <summary className="cursor-pointer capitalize text-slate-200">{group.replace(/-/g, ' ')}</summary>
      {items.filter(item => item.key.startsWith(group + '.')).map(item => <label key={item.key} className="flex gap-2 py-1 text-sm text-slate-300"><input type="checkbox" checked={choice.permissions.includes(item.key)} onChange={event => toggle(item.key, event.target.checked)} />{item.label}<span className="sr-only"> {item.key}</span></label>)}
    </details>)}</div>}
    <p className="text-sm text-blue-200">{choice.permissions.length} permissions selected</p>
  </fieldset>;
}
