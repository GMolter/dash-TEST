import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Ban, KeyRound, Layers3, Save, Shield, Trash2, UserCheck, UserRoundCog, X } from "lucide-react";
import type { AdminReference, AdminRow, AdminUserAccountOverview } from "./types";
import { AdminDisplayValue, adminFieldLabel } from "./adminFormat";
import { ReferenceInput } from "./AdminRecordDrawer";

type Props = {
  overview: AdminUserAccountOverview | null;
  loading: boolean;
  error: string | null;
  selectedResource: string;
  onBack: () => void;
  onAccountOperation: (kind: string, values?: Record<string, unknown>) => void;
  onOpenReference: (reference: AdminReference) => void;
  onSelectResource: (resource: string) => void;
  children?: React.ReactNode;
};

type AccountForm = {
  email: string;
  displayName: string;
  organizationId: string | null;
  role: string;
};

const EMPTY_FORM: AccountForm = { email: "", displayName: "", organizationId: null, role: "member" };

const GROUP_LABELS: Record<string, string> = {
  organizations: "Organizations",
  projects: "Projects and project work",
  content: "Content",
  utilities: "Utilities",
  integrations: "Integrations and devices",
  audit: "Administrative activity",
};

export function AdminUserAccountPage({ overview, loading, error, selectedResource, onBack, onAccountOperation, onOpenReference, onSelectResource, children }: Props) {
  const [showEmpty, setShowEmpty] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<AccountForm>(EMPTY_FORM);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [organizationInputVersion, setOrganizationInputVersion] = useState(0);
  const resources = overview?.resources || [];
  const selected = resources.find((item) => item.key === selectedResource);
  const grouped = useMemo(() => {
    const visible = resources.filter((item) => showEmpty || item.total === null || item.total > 0);
    return Object.entries(visible.reduce<Record<string, typeof visible>>((groups, item) => {
      (groups[item.group] ||= []).push(item);
      return groups;
    }, {}));
  }, [resources, showEmpty]);

  useEffect(() => {
    const user = overview?.user;
    if (!user) return;
    setForm({
      email: String(user.email || ""),
      displayName: String(user.display_name || ""),
      organizationId: user.org_id ? String(user.org_id) : null,
      role: String(user.role || "member"),
    });
    setTemporaryPassword("");
    setOrganizationInputVersion((value) => value + 1);
  }, [overview?.user]);

  if (loading && !overview) return <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-5 py-20 text-center text-sm text-slate-400">Loading the complete account record…</div>;
  if (error || !overview) return <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-sm text-red-100">{error || "This account could not be loaded."}<button onClick={onBack} className="mt-4 block text-blue-200 hover:underline">Return to People</button></div>;

  const user = overview.user;
  const name = String(user.display_name || user.email || "Unnamed account");
  const email = String(user.email || "No email address");
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const banned = !!user.banned_until && new Date(String(user.banned_until)).getTime() > Date.now();
  const fields = overview.userFields.filter((field) => !["id", "temporary_password", "display_name", "email"].includes(field.name));
  const changes = accountChanges(user, form);

  function clearOrganization() {
    setForm((current) => ({ ...current, organizationId: null }));
    setOrganizationInputVersion((value) => value + 1);
  }

  return <div className="space-y-5">
    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to all people</button>

    <section className="rounded-2xl border border-white/10 bg-slate-950/45 p-5 shadow-xl backdrop-blur-xl">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-500/15 text-lg font-semibold text-blue-100">{initials || "?"}</div>
          <div className="min-w-0">
            <div className="text-xs text-blue-300">Account management</div>
            <h2 className="mt-1 truncate text-2xl font-semibold text-white">{name}</h2>
            <a href={`mailto:${email}`} className="mt-1 block truncate text-sm text-slate-400 hover:text-blue-200">{email}</a>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge label={banned ? "Banned" : "Active"} tone={banned ? "red" : "green"} />
              {user.app_admin === true && <Badge label="App admin" tone="blue" />}
              {user.force_password_change === true && <Badge label="Password change required" tone="amber" />}
              {Boolean(user.role) && <Badge label={String(user.role)} />}
            </div>
          </div>
        </div>
        <button onClick={() => setEditing((value) => !value)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/15 px-4 py-2.5 text-sm font-medium text-blue-100 hover:bg-blue-500/20">{editing ? <X className="h-4 w-4" /> : <UserRoundCog className="h-4 w-4" />} {editing ? "Close editor" : "Edit account and access"}</button>
      </div>
      <div className="mt-5 grid gap-3 border-t border-white/8 pt-4 sm:grid-cols-2 xl:grid-cols-4">
        <div><div className="text-xs text-slate-500">User ID</div><div className="mt-1 break-all text-sm text-slate-300">{String(user._admin_id)}</div></div>
        <div><div className="text-xs text-slate-500">Owned records</div><div className="mt-1 text-sm text-slate-200">{Math.max(0, overview.totalRecords - 1).toLocaleString()}</div></div>
        <div><div className="text-xs text-slate-500">Organization</div><div className="mt-1 text-sm text-slate-200">{user._admin_refs?.org_id ? <button onClick={() => onOpenReference(user._admin_refs!.org_id)} className="inline-flex items-center gap-1 text-blue-200 hover:underline">{user._admin_refs.org_id.label}<ArrowUpRight className="h-3.5 w-3.5" /></button> : "No organization"}</div></div>
        <div><div className="text-xs text-slate-500">Access level</div><div className="mt-1 text-sm text-slate-200">{user.app_admin === true ? "Application administrator" : "Standard application user"}</div></div>
      </div>
    </section>

    {editing && <section className="rounded-2xl border border-blue-400/20 bg-slate-950/55 p-5 shadow-xl shadow-blue-950/10 backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="font-semibold text-white">Edit account and access</h3><p className="mt-1 text-sm text-slate-400">Changes stay on this page and go through the normal confirmation and audit review.</p></div>
        <button disabled={!form.email.trim() || Object.keys(changes).length === 0} onClick={() => onAccountOperation("update", changes)} className="inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/15 px-4 py-2 text-sm font-medium text-blue-100 disabled:opacity-40"><Save className="h-4 w-4" /> Review changes</button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-slate-400">Email <span className="text-red-300">*</span><input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400/50" /></label>
        <label className="text-xs font-medium text-slate-400">Display name<input value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400/50" /></label>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2"><span className="text-xs font-medium text-slate-400">Organization</span>{form.organizationId && <button type="button" onClick={clearOrganization} className="text-xs text-slate-500 hover:text-red-200">Remove organization</button>}</div>
          <ReferenceInput key={`${user._admin_id}:organization:${organizationInputVersion}`} field={{ name: "org_id", label: "Organization", type: "text" }} value={form.organizationId} initialLabel={form.organizationId === String(user.org_id || "") ? user._admin_refs?.org_id?.label : undefined} onChange={(value) => setForm((current) => ({ ...current, organizationId: value ? String(value) : null }))} />
        </div>
        <label className="text-xs font-medium text-slate-400">Organization role<select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-sm capitalize text-white outline-none focus:border-blue-400/50"><option value="member">Member</option><option value="admin">Admin</option><option value="owner">Owner</option></select></label>
        <label className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-200 sm:col-span-2"><input type="checkbox" checked={form.appAdmin} onChange={(event) => setForm((current) => ({ ...current, appAdmin: event.target.checked }))} className="h-4 w-4 accent-blue-500" /><span><span className="block font-medium">Application administrator</span><span className="block text-xs text-slate-500">Can unlock and use this operations console.</span></span></label>
      </div>

      <div className="mt-5 grid gap-4 border-t border-white/8 pt-5 lg:grid-cols-[1fr_auto]">
        {overview.userActions.includes("reset-password") && <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4"><div className="flex items-center gap-2 text-sm font-medium text-white"><KeyRound className="h-4 w-4 text-blue-300" /> Set a temporary password</div><p className="mt-1 text-xs text-slate-400">The user must replace it before the rest of the app will open.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input aria-label="Temporary password" type="password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} placeholder="At least 12 characters" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" /><button disabled={temporaryPassword.length < 12} onClick={() => onAccountOperation("reset-password", { temporary_password: temporaryPassword })} className="rounded-xl border border-blue-400/25 bg-blue-500/10 px-3 py-2 text-sm text-blue-100 disabled:opacity-40">Review password reset</button></div></div>}
        <div className="flex flex-wrap content-start gap-2 lg:max-w-64">
          {overview.userActions.includes(banned ? "unban" : "ban") && <button onClick={() => onAccountOperation(banned ? "unban" : "ban")} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${banned ? "border-emerald-400/25 bg-emerald-400/5 text-emerald-200" : "border-red-400/25 bg-red-400/5 text-red-200"}`}>{banned ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}{banned ? "Unban account" : "Ban account"}</button>}
          {overview.userActions.includes("delete") && <button onClick={() => onAccountOperation("delete")} className="inline-flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-400/5 px-3 py-2 text-sm text-red-200"><Trash2 className="h-4 w-4" /> Delete permanently</button>}
        </div>
      </div>
    </section>}

    {selectedResource ? <>
      <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/35 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div><button onClick={() => onSelectResource("")} className="text-xs text-blue-300 hover:text-blue-200">← Account overview</button><h3 className="mt-1 text-lg font-semibold text-white">{selected?.label || "Account data"}</h3><p className="mt-1 text-sm text-slate-400">Only records owned by {name}, or contained in their projects, are shown.</p></div>
        <label className="text-xs text-slate-400">Account data
          <select value={selectedResource} onChange={(event) => onSelectResource(event.target.value)} className="mt-1 block min-w-60 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">
            {resources.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.total ?? "unavailable"})</option>)}
          </select>
        </label>
      </section>
      {children}
    </> : <>
      <section className="rounded-2xl border border-white/10 bg-slate-950/45 p-5 backdrop-blur-xl">
        <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-blue-300" /><h3 className="font-semibold text-white">Account record</h3></div>
        <p className="mt-1 text-sm text-slate-400">Authentication, organization access, and account lifecycle information.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{fields.map((field) => {
          const reference = user._admin_refs?.[field.name];
          return <div key={field.name} className="rounded-xl border border-white/8 bg-white/[0.02] p-3"><div className="text-xs text-slate-500">{adminFieldLabel(field)}</div><div className="mt-1 break-words text-sm text-slate-200">{reference ? <button onClick={() => onOpenReference(reference)} className="inline-flex items-center gap-1 text-blue-200 hover:underline">{reference.label}<ArrowUpRight className="h-3.5 w-3.5" /></button> : <AdminDisplayValue value={user[field.name]} field={field} />}</div></div>;
        })}</div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/45 p-5 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-violet-300" /><div><h3 className="font-semibold text-white">Data owned by this user</h3><p className="mt-1 text-sm text-slate-400">Directly owned records, plus records contained in projects this user owns. Other organization members’ data is excluded.</p></div></div><button onClick={() => setShowEmpty((value) => !value)} className="text-xs text-slate-400 hover:text-white">{showEmpty ? "Hide empty categories" : "Show empty categories"}</button></div>
        <div className="mt-5 space-y-5">{grouped.map(([group, items]) => <div key={group}><div className="mb-2 text-xs font-medium text-slate-500">{GROUP_LABELS[group] || group}</div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <button key={item.key} disabled={item.total === null} onClick={() => onSelectResource(item.key)} className="group flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-left hover:border-blue-400/20 hover:bg-blue-500/[0.06] disabled:cursor-not-allowed disabled:opacity-50"><div><div className="text-sm font-medium text-slate-200 group-hover:text-white">{item.label}</div><div className="mt-0.5 text-xs text-slate-500">{item.total === null ? "Unavailable" : `${item.total.toLocaleString()} record${item.total === 1 ? "" : "s"}`}</div></div><ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-blue-300" /></button>)}</div></div>)}</div>
      </section>
    </>}
  </div>;
}

function accountChanges(user: AdminRow, form: AccountForm) {
  const next: Record<string, unknown> = {
    email: form.email.trim(),
    display_name: form.displayName.trim(),
    org_id: form.organizationId,
    role: form.role,
    app_admin: form.appAdmin,
  };
  const current: Record<string, unknown> = {
    email: String(user.email || ""),
    display_name: String(user.display_name || ""),
    org_id: user.org_id ? String(user.org_id) : null,
    role: String(user.role || "member"),
    app_admin: user.app_admin === true,
  };
  return Object.fromEntries(Object.entries(next).filter(([key, value]) => value !== current[key]));
}

function Badge({ label, tone = "slate" }: { label: string; tone?: "slate" | "green" | "red" | "blue" | "amber" }) {
  const colors = { slate: "bg-white/5 text-slate-300", green: "bg-emerald-400/10 text-emerald-200", red: "bg-red-400/10 text-red-200", blue: "bg-blue-400/10 text-blue-200", amber: "bg-amber-400/10 text-amber-200" };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${colors[tone]}`}>{label}</span>;
}
