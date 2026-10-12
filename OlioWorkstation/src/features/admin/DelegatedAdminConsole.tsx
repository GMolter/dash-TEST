import { AdminWorkspaceBrowser } from './AdminWorkspaceBrowser';
import { AdminAccountQuicklinks } from './AdminAccountQuicklinks';
import { DashboardPhotoSettings } from '../../components/DashboardPhotoSettings';
import { useEffect, useState } from 'react';
import { resourceInSection } from './adminNavigation';
import { loadAdminResource } from './api';
import { useAdminAccess } from './AdminAccessBoundary';
import { AdminResourceTable } from './AdminResourceTable';
import { AdminRecordDrawer } from './AdminRecordDrawer';
import { AdminOperationDialog } from './AdminOperationDialog';
import type { AdminListResponse, AdminOverview, AdminRow, AdminOperation } from './types';
export function DelegatedAdminConsole({ overview, section, refreshVersion, onNavigate, initialResource }: { overview: AdminOverview; section: string; refreshVersion: number; onNavigate: (resource: string) => void; initialResource: string }) {
  const access = useAdminAccess();
  const [account, setAccount] = useState<AdminRow | null>(null);
  const [appearance, setAppearance] = useState<AdminRow | null>(null);
  const resources = overview.resources.filter(item => resourceInSection(item.group, section));
  const [resource, setResource] = useState(resources.some(item => item.key === initialResource) ? initialResource : resources[0]?.key || '');
  const [data, setData] = useState<AdminListResponse | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<string>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [selected, setSelected] = useState(new Set<string>());
  const [row, setRow] = useState<AdminRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, unknown>>({});
  const [operation, setOperation] = useState<Omit<AdminOperation, 'reason'> | null>(null);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => { if (!resource || !overview) return; let live = true; setData(null); setError(''); loadAdminResource({ resource, page, pageSize: 25, search, sort, filters }).then(next => { if (live) setData(next); }).catch(error => { if (live) setError(error.message); }); return () => { live = false; }; }, [overview, resource, page, search, sort, filters, refresh, refreshVersion]);
  const navigate = (key: string) => { if (!overview.resources.some(item => item.key === key)) return; if (!resources.some(item => item.key === key)) { onNavigate(key); return; } setError(''); setAccount(null); setAppearance(null); setResource(key); setPage(1); setSearch(''); setSort(undefined); setFilters({}); setRow(null); setCreating(false); setSelected(new Set()); setRevealed({}); history.replaceState({}, '', `/admin?section=${encodeURIComponent(section)}&resource=${encodeURIComponent(key)}`); };
  const request = (kind: string, values?: Record<string, unknown>, ids?: string[], revealFields?: string[]) => setOperation({ resource, kind, values, ids: ids || (row ? [row._admin_id] : undefined), revealFields });
  const table = resource && <AdminResourceTable layout={section === "workspace" ? "cards" : undefined} activeId={row?._admin_id} data={data} loading={!data} search={search} filters={filters} selected={selected} onSearch={value => { setSearch(value); setPage(1); }} onFilters={setFilters} onSelection={setSelected} onOpen={setRow} onOpenReference={reference => navigate(reference.resource)} onCreate={() => setCreating(true)} onPage={setPage} onSort={setSort} onBulkDelete={() => request('delete', undefined, [...selected])} onBulkUpdate={(field, value) => request('update', { [field]: value }, [...selected])} />;
  const inspector = data && (row || creating) && <AdminRecordDrawer embedded label={data.label} fields={data.fields} actions={row?._admin_protected ? [] : data.actions} row={row} creating={creating} revealed={revealed} onClose={() => { setRow(null); setCreating(false); setRevealed({}); }} onReveal={field => request('reveal', undefined, undefined, [field])} onOpenReference={reference => navigate(reference.resource)} onOperation={request} />;
  return <div className="space-y-5">
    {section !== "workspace" && <section className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/35 p-4">
      <div><p className="text-xs text-blue-300">Current data view</p><h2 className="mt-1 text-lg font-semibold text-white">{resources.find(item => item.key === resource)?.label || 'No assigned areas'}</h2><p className="mt-1 text-sm text-slate-400">Search, review, and manage records within your assigned access.</p></div>
      <label className="text-xs text-slate-400">Data view<select value={resource} onChange={event => navigate(event.target.value)} className="mt-1 block min-w-56 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">{resources.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
    </section>}
    {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
    {!resource && overview && <p>No administrative sections are assigned. Contact an application owner.</p>}
    {section === "workspace" ? <AdminWorkspaceBrowser resources={resources} resource={resource} onSelect={navigate} inspector={inspector}>{table}</AdminWorkspaceBrowser> : table}
    {appearance && <section><button onClick={() => setAppearance(null)}>Close appearance</button><fieldset disabled={!access?.permissions.includes('users.background-write')}><DashboardPhotoSettings accountUserId={appearance._admin_id} /></fieldset></section>}
    {account && <section><button onClick={() => setAccount(null)}>Close account quick links</button><AdminAccountQuicklinks user={account} onComplete={() => setRefresh(value => value + 1)} onOpenReference={reference => navigate(reference.resource)} /></section>}
    {resource === 'users' && row && !row._admin_protected && access?.permissions.includes('users.fields.id.read') && <div className="flex gap-3">{access?.permissions.includes('users.background-view') && <button onClick={() => { setAppearance(row); setRow(null); }}>Dashboard appearance</button>}{access?.permissions.includes('quicklinks.bulk-quicklinks') && <button onClick={() => { setAccount(row); setRow(null); }}>Account quick links</button>}</div>}
    {section !== "workspace" && inspector}
    <AdminOperationDialog operation={operation} title="Confirm administrative operation" onCancel={() => setOperation(null)} onComplete={result => { if (operation?.kind === 'reveal') setRevealed(result as Record<string, unknown>); else { setRow(null); setCreating(false); setRefresh(value => value + 1); } setOperation(null); }} />
  </div>;
}
