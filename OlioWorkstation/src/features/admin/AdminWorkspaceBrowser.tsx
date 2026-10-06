import { useState, type ReactNode } from 'react';
import { Database, Search } from 'lucide-react';
import type { AdminOverview } from './types';
import { workspaceGroups } from './adminNavigation';

export function AdminWorkspaceBrowser({ resources, resource, description, onSelect, inspector, children }: {
  resources: AdminOverview['resources']; resource: string; description?: string;
  onSelect: (resource: string) => void; inspector?: ReactNode; children: ReactNode;
}) {
  const [query, setQuery] = useState('');
  const current = resources.find(item => item.key === resource);
  const matches = resources.filter(item => item.label.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5">
    <p className="text-sm text-slate-400">Browse projects, content, and utilities in one place. Choose a collection to find and manage its records.</p>
    <div className="grid items-start gap-5 lg:grid-cols-[180px_minmax(0,1fr)]">
      <nav aria-label="Workspace collections" className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
        <label className="relative block"><Search className="pointer-events-none absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-500" /><input aria-label="Find a collection" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a collection" className="w-full rounded-lg border border-white/10 bg-slate-900/60 py-2.5 pl-8 pr-2 text-xs text-white outline-none focus:border-blue-400/50" /></label>
        <div className="mt-3 grid max-h-64 gap-4 overflow-y-auto sm:grid-cols-3 lg:max-h-[65vh] lg:grid-cols-1">
          {workspaceGroups.map(group => {
            const items = matches.filter(item => item.group === group);
            return items.length > 0 && <div key={group}><h2 className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">{group}</h2><div className="space-y-1">{items.map(item => <button key={item.key} aria-current={resource === item.key ? 'page' : undefined} onClick={() => onSelect(item.key)} className={`w-full rounded-lg px-2 py-2 text-left text-xs leading-5 ${resource === item.key ? 'bg-blue-400/15 font-medium text-blue-200' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>{item.label}</button>)}</div></div>;
          })}
        </div>
        {!matches.length && <p className="p-2 text-xs text-slate-400">No matching collections.</p>}
      </nav>
      <div className="min-w-0 space-y-4">
        <header className="flex items-start gap-3"><div className="rounded-xl bg-blue-400/10 p-2.5"><Database className="h-5 w-5 text-blue-300" /></div><div><h2 className="text-xl font-semibold">{current?.label || 'Choose a collection'}</h2><p className="mt-1 text-sm leading-5 text-slate-400">{description}</p></div></header>
        <div className={inspector ? 'grid items-start gap-4 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.2fr)]' : ''}>
          <div className="min-w-0">{children}</div>
          {inspector && <div className="order-first min-w-0 lg:order-none">{inspector}</div>}
        </div>
      </div>
    </div>
  </div>;
}
