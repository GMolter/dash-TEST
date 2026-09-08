import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, BookOpenText, Building2, Database, FolderKanban, Gauge,
  LayoutDashboard, Loader2, LogOut, Menu, Plug, RefreshCw, Shield, ShieldAlert,
  Users, Wrench, X,
} from "lucide-react";
import { loadAdminOverview, loadAdminResource, loginAdmin, logoutAdmin } from "./api";
import { AdminOperationDialog } from "./AdminOperationDialog";
import { AdminRecordDrawer } from "./AdminRecordDrawer";
import { AdminResourceTable } from "./AdminResourceTable";
import type { AdminListResponse, AdminOperation, AdminOverview, AdminReference, AdminRow } from "./types";

type AccessState = "checking" | "login" | "denied" | "ready";
type PendingOperation = { operation: Omit<AdminOperation, "reason">; title: string } | null;

const NAVIGATION = [
  { key: "overview", label: "Overview", icon: Gauge },
  { key: "people", label: "People", icon: Users },
  { key: "organizations", label: "Organizations", icon: Building2 },
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "content", label: "Content", icon: Database },
  { key: "utilities", label: "Utilities", icon: Wrench },
  { key: "integrations", label: "Integrations", icon: Plug },
  { key: "platform", label: "Platform", icon: LayoutDashboard },
  { key: "audit", label: "Audit", icon: Activity },
] as const;

export function AdminOperationsConsole() {
  const initial = readLocation();
  const [access, setAccess] = useState<AccessState>("checking");
  const [accessError, setAccessError] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [section, setSection] = useState(initial.section);
  const [resource, setResource] = useState(initial.resource);
  const [requestedRecord, setRequestedRecord] = useState(initial.record);
  const [data, setData] = useState<AdminListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<string | undefined>();
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [row, setRow] = useState<AdminRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, unknown>>({});
  const [pending, setPending] = useState<PendingOperation>(null);
  const [toast, setToast] = useState<string | null>(null);

  const resources = overview?.resources || [];
  const sectionResources = useMemo(() => resources.filter((item) => item.group === section), [resources, section]);

  const bootstrap = useCallback(async () => {
    setAccessError(null);
    try {
      const next = await loadAdminOverview();
      setOverview(next);
      setAccess("ready");
      if (section !== "overview" && !next.resources.some((item) => item.key === resource)) {
        const first = next.resources.find((item) => item.group === section);
        setResource(first?.key || "users");
      }
    } catch (nextError) {
      const status = (nextError as Error & { status?: number }).status;
      setAccess(status === 403 ? "denied" : "login");
      if (status && status !== 401) setAccessError(nextError instanceof Error ? nextError.message : "Admin access failed.");
    }
  }, [resource, section]);

  useEffect(() => { void bootstrap(); }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const refreshResource = useCallback(async () => {
    if (access !== "ready" || section === "overview" || !resource) return;
    setLoading(true);
    setError(null);
    try {
      const next = await loadAdminResource({ resource, page, pageSize: 25, search, sort, direction, filters, recordId: requestedRecord || undefined });
      setData(next);
      if (requestedRecord && next.rows[0]) {
        setRow(next.rows[0]);
        setRequestedRecord("");
      }
      if (!sort) { setSort(next.sort); setDirection(next.direction); }
    } catch (nextError) {
      const status = (nextError as Error & { status?: number }).status;
      if (status === 401) setAccess("login");
      else if (status === 403) setAccess("denied");
      else setError(nextError instanceof Error ? nextError.message : "Could not load records.");
    } finally { setLoading(false); }
  }, [access, direction, filters, page, requestedRecord, resource, search, section, sort]);

  useEffect(() => { void refreshResource(); }, [refreshResource]);

  useEffect(() => {
    const query = new URLSearchParams();
    query.set("section", section);
    if (section !== "overview" && resource) query.set("resource", resource);
    if (row?._admin_id) query.set("record", row._admin_id);
    window.history.replaceState({}, "", `/admin?${query.toString()}`);
  }, [resource, row, section]);

  function selectSection(nextSection: string) {
    setSection(nextSection);
    setMobileOpen(false);
    setPage(1);
    setSearchInput("");
    setSearch("");
    setSort(undefined);
    setFilters({});
    setSelected(new Set());
    setRow(null);
    setCreating(false);
    setRevealed({});
    setRequestedRecord("");
    if (nextSection !== "overview") {
      const first = resources.find((item) => item.group === nextSection);
      setResource(first?.key || "users");
    }
  }

  function selectResource(nextResource: string) {
    setResource(nextResource);
    setPage(1);
    setSort(undefined);
    setFilters({});
    setSelected(new Set());
    setRow(null);
    setCreating(false);
    setRevealed({});
    setRequestedRecord("");
  }

  function openReference(reference: AdminReference) {
    const target = resources.find((item) => item.key === reference.resource);
    if (!target) return;
    setSection(target.group);
    setResource(reference.resource);
    setRequestedRecord(reference.id);
    setPage(1);
    setSearchInput("");
    setSearch("");
    setSort(undefined);
    setFilters({});
    setSelected(new Set());
    setRow(null);
    setCreating(false);
    setRevealed({});
    setMobileOpen(false);
  }

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setLoginBusy(true);
    setAccessError(null);
    try {
      await loginAdmin(password);
      setPassword("");
      await bootstrap();
    } catch (nextError) {
      const status = (nextError as Error & { status?: number }).status;
      if (status === 403) setAccess("denied");
      setAccessError(nextError instanceof Error ? nextError.message : "Login failed.");
    } finally { setLoginBusy(false); }
  }

  async function logout() {
    try { await logoutAdmin(); } catch { /* cookie may already be expired */ }
    setOverview(null);
    setData(null);
    setAccess("login");
    setRow(null);
    setRevealed({});
  }

  function requestOperation(kind: string, values?: Record<string, unknown>, ids?: string[], revealFields?: string[]) {
    const targetIds = ids || (row ? [row._admin_id] : []);
    setPending({
      title: operationTitle(kind, data?.label || resource, targetIds.length || 1),
      operation: { resource, kind, ids: kind === "create" ? undefined : targetIds, values, revealFields },
    });
  }

  function operationComplete(result: unknown) {
    if (pending?.operation.kind === "reveal" && result && typeof result === "object") {
      const next = result as Record<string, unknown>;
      setRevealed((current) => ({ ...current, ...next }));
      setPending(null);
      setToast("Sensitive field revealed and audit event recorded.");
      return;
    }
    setPending(null);
    setCreating(false);
    setRow(null);
    setRevealed({});
    setSelected(new Set());
    setToast("Admin operation completed and audited.");
    void refreshResource();
    void loadAdminOverview().then(setOverview).catch(() => undefined);
  }

  if (access === "checking") return <FullPageStatus icon={Loader2} title="Checking admin access" detail="Verifying both your app account and admin session." spinning />;
  if (access === "login") return <AdminLogin password={password} busy={loginBusy} error={accessError} onPassword={setPassword} onSubmit={login} />;
  if (access === "denied") return <FullPageStatus icon={ShieldAlert} title="Admin access blocked" detail={accessError || "This signed-in account does not have app-admin permission."} action={<button onClick={logout} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200">Clear admin session</button>} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
      <div className="flex min-h-screen">
        <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-xl transition-transform lg:sticky lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between px-2 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-500/15"><Shield className="h-5 w-5 text-blue-300" /></div>
              <div><div className="font-semibold text-blue-100">Olio Admin</div><div className="text-xs text-slate-500">Operations console</div></div>
            </div>
            <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-slate-400 lg:hidden" aria-label="Close navigation"><X className="h-5 w-5" /></button>
          </div>
          <nav className="mt-5 flex-1 space-y-1 overflow-y-auto">
            {NAVIGATION.map((item) => {
              const Icon = item.icon;
              const active = section === item.key;
              return <button key={item.key} onClick={() => selectSection(item.key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${active ? "border border-blue-400/25 bg-blue-500/15 text-blue-100 shadow-lg shadow-blue-950/20" : "border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-100"}`}><Icon className="h-4 w-4" />{item.label}</button>;
            })}
          </nav>
          <div className="space-y-2 border-t border-white/10 pt-4">
            <a href="/" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white"><LayoutDashboard className="h-4 w-4" /> Back to Olio</a>
            <button onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white"><LogOut className="h-4 w-4" /> Lock admin console</button>
          </div>
        </aside>

        {mobileOpen && <button className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation backdrop" />}

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileOpen(true)} className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-200 lg:hidden" aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
              <div><div className="text-xs uppercase tracking-[0.2em] text-blue-300">App administration</div><h1 className="mt-1 text-2xl font-semibold">{NAVIGATION.find((item) => item.key === section)?.label || "Overview"}</h1></div>
            </div>
            <button onClick={() => section === "overview" ? bootstrap() : refreshResource()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
          </header>

          {toast && <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100"><span>{toast}</span><button onClick={() => setToast(null)}><X className="h-4 w-4" /></button></div>}
          {error && <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}

          {section === "overview" ? <Overview overview={overview} onNavigate={selectSection} /> : (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                {sectionResources.map((item) => <button key={item.key} onClick={() => selectResource(item.key)} className={`rounded-xl border px-3 py-2 text-sm ${resource === item.key ? "border-blue-400/30 bg-blue-500/15 text-blue-100" : "border-white/10 bg-white/[0.025] text-slate-400 hover:text-white"}`}>{item.label}</button>)}
                {section === "platform" && <button onClick={() => navigate("/admin/editor")} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-sm text-slate-300"><BookOpenText className="h-4 w-4" /> Full help editor</button>}
              </div>
              <AdminResourceTable data={data} loading={loading} search={searchInput} filters={filters} selected={selected} onSearch={setSearchInput}
                onFilters={(next) => { setFilters(next); setPage(1); setSelected(new Set()); }} onSelection={setSelected}
                onOpen={(nextRow) => { setRow(nextRow); setCreating(false); setRevealed({}); }} onOpenReference={openReference} onCreate={() => { setCreating(true); setRow(null); setRevealed({}); }}
                onPage={setPage} onSort={(field) => { setPage(1); setSort(field); setDirection((current) => sort === field && current === "asc" ? "desc" : "asc"); }}
                onBulkDelete={() => requestOperation("delete", undefined, [...selected])} onBulkUpdate={(field, value) => requestOperation("update", { [field]: value }, [...selected])} />
            </>
          )}
        </main>
      </div>

      {data && (row || creating) && <AdminRecordDrawer label={data.label} fields={data.fields} actions={data.actions} row={row} creating={creating} revealed={revealed}
        onClose={() => { setRow(null); setCreating(false); setRevealed({}); }} onReveal={(field) => requestOperation("reveal", undefined, undefined, [field])} onOpenReference={openReference}
        onOperation={(kind, values) => requestOperation(kind, values)} />}
      <AdminOperationDialog operation={pending?.operation || null} title={pending?.title || "Confirm admin operation"} onCancel={() => setPending(null)} onComplete={operationComplete} />
    </div>
  );
}

function Overview({ overview, onNavigate }: { overview: AdminOverview | null; onNavigate: (section: string) => void }) {
  const cards = [
    ["users", "Users", Users, "people"], ["organizations", "Organizations", Building2, "organizations"],
    ["projects", "Projects", FolderKanban, "projects"], ["content", "Content records", Database, "content"],
    ["devices", "Launcher devices", Plug, "integrations"], ["pendingPairings", "Pending pairings", ShieldAlert, "integrations"],
    ["calendars", "Calendars", Activity, "integrations"], ["audits", "Audit events", Shield, "audit"],
  ] as const;
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([key, label, Icon, section]) => <button key={key} onClick={() => onNavigate(section)} className="group rounded-2xl border border-white/10 bg-slate-950/45 p-5 text-left shadow-xl backdrop-blur-xl transition hover:border-blue-400/25 hover:bg-blue-500/[0.06]"><div className="flex items-center justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10"><Icon className="h-5 w-5 text-blue-300" /></div><span className="text-3xl font-semibold text-white">{overview?.metrics[key]?.toLocaleString() ?? "—"}</span></div><div className="mt-4 text-sm text-slate-400 group-hover:text-slate-200">{label}</div></button>)}</div>
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/45 backdrop-blur-xl"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><h2 className="font-semibold">Recent administrative activity</h2><p className="mt-1 text-xs text-slate-500">Sensitive values never appear in this trail.</p></div><button onClick={() => onNavigate("audit")} className="text-sm text-blue-300 hover:text-blue-200">View audit log</button></div><div className="divide-y divide-white/[0.06]">{overview?.recentAudit.length ? overview.recentAudit.map((event) => <div key={String(event.id)} className="grid gap-2 px-5 py-3 text-sm sm:grid-cols-[1fr_1fr_2fr_auto]"><span className="truncate text-slate-300">{String(event.actor_email || "Unknown admin")}</span><span className="capitalize text-blue-200">{String(event.action)} {String(event.resource)}</span><span className="truncate text-slate-500">{String(event.reason)}</span><span className="text-xs text-slate-600">{formatDate(event.created_at)}</span></div>) : <div className="px-5 py-12 text-center text-sm text-slate-500">No audit events yet. Apply the admin migration before performing operations.</div>}</div></section>
  </div>;
}

function AdminLogin({ password, busy, error, onPassword, onSubmit }: { password: string; busy: boolean; error: string | null; onPassword: (value: string) => void; onSubmit: (event: React.FormEvent) => void }) {
  return <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white"><div className="mx-auto flex min-h-[80vh] max-w-md items-center"><form onSubmit={onSubmit} className="w-full rounded-3xl border border-white/10 bg-slate-950/50 p-7 shadow-2xl backdrop-blur-xl"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-500/15"><Shield className="h-6 w-6 text-blue-300" /></div><h1 className="mt-5 text-2xl font-semibold">Unlock Olio Admin</h1><p className="mt-2 text-sm leading-6 text-slate-400">Your signed-in account must be an app admin. The second-factor password creates a 12-hour HttpOnly session.</p><label className="mt-6 block text-sm text-slate-300">Admin password<input autoFocus type="password" value={password} onChange={(event) => onPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-white outline-none focus:border-blue-400/50" /></label>{error && <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</div>}<button disabled={busy || !password} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/15 py-2.5 font-medium text-blue-100 disabled:opacity-40">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Unlock console</button></form></div></div>;
}

function FullPageStatus({ icon: Icon, title, detail, spinning = false, action }: { icon: typeof Shield; title: string; detail: string; spinning?: boolean; action?: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-center text-white"><div className="max-w-md rounded-3xl border border-white/10 bg-slate-950/50 p-8 backdrop-blur-xl"><Icon className={`mx-auto h-8 w-8 text-blue-300 ${spinning ? "animate-spin" : ""}`} /><h1 className="mt-4 text-xl font-semibold">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>{action && <div className="mt-5">{action}</div>}</div></div>;
}

function operationTitle(kind: string, resource: string, count: number) {
  const names: Record<string, string> = { create: "Create", update: count > 1 ? `Update ${count}` : "Update", delete: count > 1 ? `Delete ${count}` : "Delete", reveal: "Reveal protected information in", suspend: "Suspend", reactivate: "Reactivate", "reset-password": "Reset password for", "transfer-owner": "Transfer ownership of", "regenerate-code": "Regenerate join code for", revoke: "Revoke", cancel: "Cancel", disconnect: "Disconnect" };
  return `${names[kind] || "Change"} ${resource}`;
}

function readLocation() {
  const query = new URLSearchParams(window.location.search);
  return { section: query.get("section") || "overview", resource: query.get("resource") || "users", record: query.get("record") || "" };
}

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function formatDate(value: unknown) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}
