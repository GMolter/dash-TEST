import { AdminAccountQuicklinks } from './AdminAccountQuicklinks';
import { DashboardPhotoSettings } from '../../components/DashboardPhotoSettings';
import { useEffect, useState } from 'react';
import { loadAdminOverview, loadAdminResource } from './api';
import { useAdminAccess } from './AdminAccessBoundary';
import { AdminResourceTable } from './AdminResourceTable';
import { AdminRecordDrawer } from './AdminRecordDrawer';
import { AdminOperationDialog } from './AdminOperationDialog';
import type { AdminListResponse, AdminOverview, AdminRow, AdminOperation } from './types';
export function DelegatedAdminConsole() {
  const access = useAdminAccess();
  const [account, setAccount] = useState<AdminRow | null>(null);
  const [appearance, setAppearance] = useState<AdminRow | null>(null);
  const [overview, setOverview] = useState<AdminOverview>();
  const [resource, setResource] = useState(new URLSearchParams(location.search).get('resource') || '');
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
  useEffect(() => { let live = true; loadAdminOverview().then(next => { if (!live) return; setOverview(next); if (!next.resources.some(item => item.key === resource)) { if (resource) setError('That view is unavailable with your current access. Choose an allowed section.'); setResource(next.resources[0]?.key || ''); } }).catch(error => { if (live) setError(error.message); }); return () => { live = false; }; }, []);
  useEffect(() => { if (!resource || !overview) return; let live = true; setData(null); loadAdminResource({ resource, page, pageSize: 25, search, sort, filters }).then(next => { if (live) setData(next); }).catch(error => { if (live) setError(error.message); }); return () => { live = false; }; }, [overview, resource, page, search, sort, filters, refresh]);
  const navigate = (key: string) => { setAccount(null); setAppearance(null); setResource(key); setPage(1); setSearch(''); setSort(undefined); setFilters({}); setRow(null); setCreating(false); setSelected(new Set()); setRevealed({}); history.replaceState({}, '', `/admin?resource=${encodeURIComponent(key)}`); };
  const request = (kind: string, values?: Record<string, unknown>, ids?: string[], revealFields?: string[]) => setOperation({ resource, kind, values, ids: ids || (row ? [row._admin_id] : undefined), revealFields });
  return <div className="min-h-screen bg-slate-950 p-6 text-slate-100 space-y-5"><header className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Administration</h1><span>{access?.preset === 'read-only' ? 'Read-only admin' : access?.preset === 'full' ? 'Full admin' : 'Custom admin'}</span><a href="/">Return to app</a></header>
    <nav aria-label="Allowed admin resources" className="flex flex-wrap gap-2">{overview?.resources.map(item => <button key={item.key} className={`rounded px-3 py-2 ${resource === item.key ? 'bg-blue-600' : 'bg-slate-800'}`} onClick={() => navigate(item.key)}>{item.label}</button>)}</nav>
    {error && <p role="alert">{error}</p>}
    {!resource && overview && <p>No administrative sections are assigned. Contact an application owner.</p>}
    {resource && <AdminResourceTable data={data} loading={!data} search={search} filters={filters} selected={selected} onSearch={value => { setSearch(value); setPage(1); }} onFilters={setFilters} onSelection={setSelected} onOpen={setRow} onOpenReference={reference => navigate(reference.resource)} onCreate={() => setCreating(true)} onPage={setPage} onSort={setSort} onBulkDelete={() => request('delete', undefined, [...selected])} onBulkUpdate={(field, value) => request('update', { [field]: value }, [...selected])} />}
    {appearance && <section><button onClick={() => setAppearance(null)}>Close appearance</button><fieldset disabled={!access?.permissions.includes('users.background-write')}><DashboardPhotoSettings accountUserId={appearance._admin_id} /></fieldset></section>}
    {account && <section><button onClick={() => setAccount(null)}>Close account quick links</button><AdminAccountQuicklinks user={account} onComplete={() => setRefresh(value => value + 1)} onOpenReference={reference => navigate(reference.resource)} /></section>}
    {resource === 'users' && row && !row._admin_protected && access?.permissions.includes('users.fields.id.read') && <div className="flex gap-3">{access?.permissions.includes('users.background-view') && <button onClick={() => { setAppearance(row); setRow(null); }}>Dashboard appearance</button>}{access?.permissions.includes('quicklinks.bulk-quicklinks') && <button onClick={() => { setAccount(row); setRow(null); }}>Account quick links</button>}</div>}
    {data && (row || creating) && <AdminRecordDrawer embedded label={data.label} fields={data.fields} actions={row?._admin_protected ? [] : data.actions} row={row} creating={creating} revealed={revealed} onClose={() => { setRow(null); setCreating(false); setRevealed({}); }} onReveal={field => request('reveal', undefined, undefined, [field])} onOpenReference={reference => navigate(reference.resource)} onOperation={request} />}
    <AdminOperationDialog operation={operation} title="Confirm administrative operation" onCancel={() => setOperation(null)} onComplete={result => { if (operation?.kind === 'reveal') setRevealed(result as Record<string, unknown>); else { setRow(null); setCreating(false); setRefresh(value => value + 1); } setOperation(null); }} />
  </div>;
}
