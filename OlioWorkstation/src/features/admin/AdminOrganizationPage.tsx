import { useEffect, useMemo, useState } from "react";
import { loadAdminResource, revealAdminField } from "./api";
import { AdminRecordDrawer, ReferenceInput } from "./AdminRecordDrawer";
import { AdminResourceTable } from "./AdminResourceTable";
import { AdminOperationDialog } from "./AdminOperationDialog";
import type { AdminListResponse, AdminOperation, AdminReference, AdminRow } from "./types";

const VIEWS = [
  ["organizations", "Settings"], ["users", "People & owners"], ["org-announcements", "Announcements"],
  ["org-resources", "Library"], ["org-activity", "History"], ["quicklinks", "Shared links"],
  ["quicklink-folders", "Link folders"], ["projects", "Projects"], ["pastes", "Pastes"],
  ["secrets", "Secrets"], ["short-urls", "Short URLs"], ["triggers", "Triggers"],
];
const button = "rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-40";
const input = "rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm";
const memberField = { name: "user_id", label: "Person", type: "text" as const };

export function AdminOrganizationPage({ organizationId, refreshVersion, onBack, onOpenReference }: {
  organizationId: string; refreshVersion: number; onBack: () => void; onOpenReference: (reference: AdminReference) => void;
}) {
  const [resource, setResource] = useState("organizations");
  const [org, setOrg] = useState<AdminRow | null>(null);
  const [code, setCode] = useState("");
  const [data, setData] = useState<AdminListResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<string>();
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [row, setRow] = useState<AdminRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, unknown>>({});
  const [pending, setPending] = useState<Omit<AdminOperation, "reason"> | null>(null);
  const [person, setPerson] = useState("");
  const [role, setRole] = useState("member");
  const [previousOwner, setPreviousOwner] = useState("");
  const [message, setMessage] = useState("");
  const defaults = useMemo(() => ({ org_id: organizationId, kind: "link", category: resource === "org-activity" ? "settings" : "General", scope: "shared", scope_org: true, scope_personal: false }), [organizationId, resource]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadAdminResource({ resource: "organizations", recordId: organizationId, page: 1, pageSize: 1, search: "" }),
      revealAdminField("organizations", organizationId, "code"),
    ]).then(([next, revealedCode]) => { if (!cancelled) { setOrg(next.rows[0] || null); setCode(String(revealedCode.result?.code || "")); } })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [organizationId, revision, refreshVersion]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(""); setData(null);
    const timer = window.setTimeout(() => {
      loadAdminResource({ resource, page, pageSize: 25, search, sort, direction,
        recordId: resource === "organizations" ? organizationId : undefined,
        filters: resource === "organizations" ? {} : { ...filters, org_id: organizationId },
      }).then(next => { if (!cancelled) setData(next); })
        .catch(e => { if (!cancelled) setError(e.message); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 200);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [organizationId, resource, page, search, sort, direction, filters, revision, refreshVersion]);

  function changeView(next: string) {
    setResource(next); setData(null); setRow(null); setCreating(false); setRevealed({}); setSelected(new Set());
    setSearch(""); setPage(1); setSort(undefined); setFilters({}); setPerson(""); setPreviousOwner("");
  }
  function operate(kind: string, values?: Record<string, unknown>, ids?: string[], revealFields?: string[]) {
    setPending({ resource, kind, values, ids: kind === "create" ? undefined : ids || (row ? [row._admin_id] : [organizationId]), revealFields });
  }
  function membership(kind: string, values: Record<string, unknown>) {
    setPending({ resource: "organizations", kind, ids: [organizationId], values });
  }
  async function reveal(field: string) {
    if (!row) return;
    if (data?.fields.find(f => f.name === field)?.auditReveal !== false) { operate("reveal", undefined, undefined, [field]); return; }
    try { const result = await revealAdminField(resource, row._admin_id, field); setRevealed(current => ({ ...current, ...result.result })); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not reveal this value."); }
  }
  function complete(result: unknown) {
    if (pending?.kind === "reveal") { setRevealed(current => ({ ...current, ...(result as Record<string, unknown>) })); setPending(null); return; }
    if (pending?.resource === "organizations" && pending.kind === "delete") { onBack(); return; }
    setPending(null); setRow(null); setCreating(false); setSelected(new Set()); setRevealed({});
    setPerson(""); setPreviousOwner(""); setRevision(v => v + 1); setMessage("Changes saved and recorded in the admin audit log.");
  }
  const tableData = data ? { ...data, filterFields: data.filterFields.filter(f => f !== "org_id"),
    actions: resource === "users" ? [] : data.actions } : null;

  return <div className="space-y-5">
    <button className={button} onClick={onBack}>← All organizations</button>
    <header className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-white/10 bg-slate-950/40 p-6">
      <div><p className="text-sm text-blue-300">Organization management</p><h2 className="mt-1 text-3xl font-semibold">{String(org?.name || "Organization")}</h2></div>
      <div><p className="text-xs text-slate-400">Join code</p><p className="font-mono text-4xl tracking-[0.2em]">{code || "—"}</p></div>
    </header>
    <nav aria-label="Organization management sections" className="flex flex-wrap gap-2">{VIEWS.map(([key, label]) =>
      <button key={key} className={`${button} ${resource === key ? "bg-blue-500/20 text-blue-100" : "text-slate-400"}`} aria-current={resource === key ? "page" : undefined} onClick={() => changeView(key)}>{label}</button>)}</nav>
    {error && <div role="alert" className="rounded-xl bg-red-500/10 p-4 text-red-200">{error}<button className="ml-3 underline" onClick={() => setRevision(v => v + 1)}>Try again</button></div>}
    {message && <p role="status" className="text-sm text-emerald-200">{message}</p>}
    {resource === "organizations" ? <section className="space-y-4 rounded-2xl border border-white/10 p-5">
      <h3 className="text-lg font-semibold">Organization settings</h3>
      <p className="text-sm text-slate-400">Edit the name, join code, and creation date. Manage every owner in People & owners.</p>
      <div className="flex flex-wrap gap-3"><button disabled={!data?.rows[0]} className={button} onClick={() => { setRow(data!.rows[0]); setRevealed({ code }); }}>Edit settings</button>
        <button className={button} onClick={() => operate("regenerate-code")}>Generate new join code</button>
        <button className={`${button} text-red-300`} onClick={() => operate("delete")}>Delete organization</button></div>
      <p className="text-xs text-slate-400">Join codes contain four digits. Changing the code immediately replaces the previous invitation code.</p>
    </section> : <>
      {resource === "users" && <section className="space-y-4 rounded-2xl border border-white/10 p-5">
        <h3 className="text-lg font-semibold">Add a member or change their role</h3>
        <p className="text-sm text-slate-400">Choose a person and their role. Multiple owners are supported; every organization must retain at least one owner. A person in another organization must be removed there first.</p>
        <div className="grid gap-3 sm:grid-cols-3"><ReferenceInput key={`${row?._admin_id || "person"}:${revision}`} field={memberField} value={person} initialLabel={row?._admin_id === person ? String(row.display_name || row.email) : undefined} onChange={v => setPerson(String(v || ""))} />
          <select aria-label="Organization role" className={input} value={role} onChange={e => setRole(e.target.value)}>{["member", "admin", "owner"].map(v => <option key={v}>{v}</option>)}</select>
          <button className={button} disabled={!person} onClick={() => membership("set-member", { member_id: person, role })}>Save membership</button></div>
        {person && <div className="flex flex-wrap gap-3"><button className={button} onClick={() => onOpenReference({ resource: "users", id: person, label: "Account" })}>Open account</button><button className={`${button} text-red-300`} onClick={() => membership("remove-member", { member_id: person })}>Remove from organization</button></div>}
        <details className="border-t border-white/10 pt-4"><summary className="cursor-pointer text-sm">Transfer ownership</summary><p className="my-3 text-sm text-slate-400">Select the owner to replace. The person selected above becomes an owner; the previous owner becomes an admin. Other owners keep their roles.</p>
          <ReferenceInput key={revision} field={{ ...memberField, label: "Previous owner" }} value={previousOwner} onChange={v => setPreviousOwner(String(v || ""))} />
          <button className={`${button} mt-3`} disabled={!person || !previousOwner || person === previousOwner} onClick={() => membership("transfer-owner", { owner_id: person, previous_owner_id: previousOwner })}>Transfer ownership to selected person</button></details>
      </section>}
      {resource === "org-activity" && <p className="text-sm text-slate-400">Edit, add, or delete entries in the organization’s activity feed. Administrative changes remain recorded separately in the admin audit log.</p>}
      <AdminResourceTable data={tableData} loading={loading} search={search} filters={filters} selected={selected} onSearch={v => { setSearch(v); setPage(1); }}
        onFilters={v => { setFilters(v); setPage(1); setSelected(new Set()); }} onSelection={setSelected}
        onOpen={next => { setRow(next); setCreating(false); setRevealed({}); if (resource === "users") { setPerson(next._admin_id); setRole(String(next.role || "member")); } }}
        onOpenReference={onOpenReference} onCreate={() => { setRow(null); setCreating(true); setRevealed({}); }} onPage={setPage}
        onSort={field => { setPage(1); setSort(field); setDirection(sort === field && direction === "asc" ? "desc" : "asc"); }}
        onBulkDelete={() => operate("delete", undefined, [...selected])} onBulkUpdate={(field, value) => operate("update", { [field]: value }, [...selected])} />
    </>}
    {data && resource !== "users" && (row || creating) && <AdminRecordDrawer label={data.label} fields={data.fields} actions={data.actions} row={row} creating={creating} initialValues={defaults} initialLabels={{ org_id: String(org?.name || "Organization") }} revealed={revealed}
      onClose={() => { setRow(null); setCreating(false); }} onReveal={field => void reveal(field)} onOpenReference={onOpenReference} onOperation={operate} />}
    <AdminOperationDialog operation={pending} title="Review organization change" onCancel={() => setPending(null)} onComplete={complete} />
  </div>;
}
