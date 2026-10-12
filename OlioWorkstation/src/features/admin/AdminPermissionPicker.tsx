import { useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';

export type PermissionItem = { key: string; label: string; parent?: string; write?: boolean; protected?: boolean; ownerOnly?: boolean };
export type PermissionCatalog = { enabled: boolean; catalog: PermissionItem[]; presets: Record<string, string[]> };
type Choice = { preset: string; permissions: string[] };
const names: Record<string, string> = { people: 'People', organizations: 'Organizations', workspace: 'Workspace data', integrations: 'Integrations', platform: 'Help Center', banner: 'Banners', features: 'New features', audit: 'Activity' };
export function permissionDependencies(item: PermissionItem) {
  const resource = item.key.split('.')[0];
  return [...new Set([...(item.parent ? [item.parent] : []), ...(resource !== 'sections' && item.key !== `${resource}.read` ? [`${resource}.read`] : []), ...(item.key.includes('.fields.') && item.key.endsWith('.update') ? [item.key.replace(/\.update$/, '.read')] : []), ...(item.key === 'users.background-write' ? ['users.background-view'] : [])])];
}
export function changePermissionGroup(items: PermissionItem[], current: string[], keys: string[], level: string) {
  const selected = new Set(current.filter(key => !keys.includes(key)));
  const byKey = new Map(items.map(item => [item.key, item]));
  function add(key: string) { if (selected.has(key) || !byKey.has(key)) return; selected.add(key); permissionDependencies(byKey.get(key)!).forEach(add); }
  if (level !== 'hidden') items.filter(item => keys.includes(item.key) && (level === 'full' || (!item.write && !item.protected))).forEach(item => add(item.key));
  let changed = true;
  while (changed) { changed = false; for (const key of selected) { const item = byKey.get(key); if (!item || permissionDependencies(item).some(parent => !selected.has(parent))) { selected.delete(key); changed = true; } } }
  return [...selected];
}
export function AdminPermissionPicker({ catalog, value, onChange, allowStandard = false, disabled = false }: { catalog: PermissionCatalog; value: Choice; onChange: (value: Choice) => void; allowStandard?: boolean; disabled?: boolean }) {
  const [search, setSearch] = useState('');
  const items = catalog.catalog.filter(item => !item.ownerOnly);
  const selected = new Set(value.permissions);
  const level = (keys: string[]) => keys.every(key => !selected.has(key)) ? 'hidden' : keys.every(key => selected.has(key)) ? 'full' : keys.every(key => selected.has(key) === (!items.find(item => item.key === key)?.write && !items.find(item => item.key === key)?.protected)) ? 'view' : 'mixed';
  const apply = (keys: string[], next: string) => onChange({ preset: 'custom', permissions: changePermissionGroup(items, value.permissions, keys, next) });
  const controls = (label: string, keys: string[]) => <div role="group" aria-label={`${label} access`} className="flex shrink-0 gap-1 rounded-lg border border-white/10 bg-slate-950/50 p-1">{[['hidden', 'Hidden'], ['view', 'View'], ['full', 'Manage']].map(([key, text]) => <button key={key} type="button" aria-pressed={level(keys) === key} onClick={() => apply(keys, key)} className={`rounded-md px-2.5 py-1.5 text-xs transition ${level(keys) === key ? 'bg-blue-400/15 text-blue-200' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>{text}</button>)}</div>;
  const presets = [...(allowStandard ? [['standard', 'Standard account', 'No admin access']] : []), ['read-only', 'Read-only admin', 'View ordinary records'], ['custom', 'Custom permissions', 'Choose access by area'], ['full', 'Full admin', 'Manage all non-owner areas']];
  return <fieldset disabled={disabled} className="min-w-0 space-y-4">
    <legend className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200"><ShieldCheck className="h-4 w-4 text-blue-300" />Admin permissions</legend>
    <div role="group" aria-label="Access level" className="grid gap-2 sm:grid-cols-2">{presets.map(([key, label, detail]) => <button type="button" key={key} aria-pressed={value.preset === key} onClick={() => onChange({ preset: key, permissions: key === 'custom' ? value.permissions : catalog.presets[key] || [] })} className={`rounded-xl border p-3 text-left transition ${value.preset === key ? 'border-blue-400/40 bg-blue-500/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/5'}`}><span className="block text-sm font-medium text-slate-100">{label}</span><span className="mt-1 block text-xs text-slate-400">{detail}</span></button>)}</div>
    {value.preset === 'custom' && <>
      <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3"><Search className="h-4 w-4 text-slate-500" /><input aria-label="Find permissions" placeholder="Find an area or permission…" value={search} onChange={event => setSearch(event.target.value)} className="w-full bg-transparent py-2.5 text-sm text-white outline-none" /></label>
      <p className="text-xs leading-5 text-slate-400">Choose View or Manage for an area. Expand it to fine-tune individual permissions. Required access is included automatically.</p>
      <div className="max-h-96 space-y-2 overflow-y-auto pr-1">{items.filter(item => item.key.startsWith('sections.') && item.key.endsWith('.read')).map(section => {
        const resources = items.filter(item => item.parent === section.key && !item.key.startsWith('sections.')).map(item => item.key.split('.')[0]);
        const group = items.filter(item => item.key.startsWith(section.key.replace(/\.read$/, '.')) || resources.includes(item.key.split('.')[0]));
        const label = names[section.key.split('.')[1]] || section.label;
        const matching = group.filter(item => `${label} ${item.label} ${item.key}`.toLowerCase().includes(search.toLowerCase()));
        if (!matching.length) return null;
        return <div key={section.key} className="rounded-xl border border-white/10 bg-slate-950/30 p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-sm font-medium text-slate-200">{label}</h4><p className="mt-1 text-xs text-slate-500">{group.filter(item => selected.has(item.key)).length} of {group.length} permissions</p></div>{controls(label, group.map(item => item.key))}</div><details className="mt-3 border-t border-white/5 pt-2" open={search ? true : undefined}><summary className="cursor-pointer text-xs text-slate-400">Fine-tune permissions</summary>{resources.map(resource => {
          const children = matching.filter(item => item.key.startsWith(resource + '.'));
          if (!children.length) return null;
          return <div key={resource} className="mt-3 space-y-2 border-t border-white/5 pt-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-medium text-slate-300">{items.find(item => item.key === resource + '.read')?.label}</span>{controls(resource, items.filter(item => item.key.startsWith(resource + '.')).map(item => item.key))}</div>{children.filter(item => !item.key.endsWith('.control') && item.key !== resource + '.read').map(item => <label key={item.key} className="flex items-center gap-2 py-1 text-xs text-slate-400"><input type="checkbox" className="accent-blue-400" checked={selected.has(item.key)} onChange={event => apply([item.key], event.target.checked ? 'full' : 'hidden')} />{item.label.replace(/-/g, ' ')}{item.protected && <span className="text-amber-300">Sensitive</span>}</label>)}</div>;
        })}</details></div>;
      })}</div>
    </>}
    <p className="text-xs text-slate-500">{value.permissions.length} permissions selected · Owner-only actions stay restricted.</p>
  </fieldset>;
}
