import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Ban, Eye, KeyRound, Pencil, RotateCcw, Save, ShieldCheck, ShieldOff, Trash2, UserCheck, UserRoundCog, X, XCircle } from "lucide-react";
import type { AdminField, AdminReference, AdminRow } from "./types";
import { AdminDisplayValue, adminFieldLabel } from "./adminFormat";
import { loadAdminResource } from "./api";

type Props = {
  label: string;
  fields: AdminField[];
  actions: string[];
  row: AdminRow | null;
  creating: boolean;
  revealed: Record<string, unknown>;
  onClose: () => void;
  onReveal: (field: string) => void;
  onOpenReference: (reference: AdminReference) => void;
  onOpenAccount?: (row: AdminRow) => void;
  lockedMessage?: string;
  onOperation: (kind: string, values?: Record<string, unknown>) => void;
};

export function AdminRecordDrawer({ label, fields, actions, row, creating, revealed, onClose, onReveal, onOpenReference, onOpenAccount, lockedMessage, onOperation }: Props) {
  const [editing, setEditing] = useState(creating);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const visibleFields = useMemo(() => fields.filter((field) => creating ? field.create : !["id", "temporary_password"].includes(field.name)), [creating, fields]);

  useEffect(() => {
    setEditing(creating);
    setTemporaryPassword("");
    const next: Record<string, unknown> = {};
    for (const field of fields) {
      const value = creating ? defaultValue(field) : row?.[field.name];
      next[field.name] = field.type === "json" && value !== null && value !== undefined
        ? JSON.stringify(value, null, 2)
        : value ?? (field.type === "boolean" ? false : "");
    }
    setValues(next);
  }, [creating, fields, row]);

  useEffect(() => {
    if (Object.keys(revealed).length) setValues((current) => ({ ...current, ...revealed }));
  }, [revealed]);

  if (!creating && !row) return null;

  function changedValues() {
    const allowed = fields.filter((field) => creating ? field.create : field.editable);
    return Object.fromEntries(allowed
      .filter((field) => creating || values[field.name] !== (field.type === "json" && row?.[field.name] != null ? JSON.stringify(row[field.name], null, 2) : row?.[field.name] ?? (field.type === "boolean" ? false : "")))
      .map((field) => [field.name, values[field.name]]));
  }

  const changed = changedValues();
  const secondaryFields = !creating && !editing ? visibleFields.filter(isSecondaryField) : [];
  const primaryFields = secondaryFields.length ? visibleFields.filter((field) => !isSecondaryField(field)) : visibleFields;

  function renderField(field: AdminField) {
    const editable = editing && (creating ? field.create : field.editable);
    const revealedValue = revealed[field.name];
    const reference = row?._admin_refs?.[field.name];
    return (
      <div key={field.name} className={field.type === "textarea" || field.type === "json" ? "sm:col-span-2" : ""}>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label className="text-xs font-medium text-slate-400">{adminFieldLabel(field)}{field.required && <span className="text-red-300"> *</span>}</label>
          {field.sensitive && !creating && revealedValue === undefined && (
            <button onClick={() => onReveal(field.name)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-amber-200 hover:bg-amber-400/10"><Eye className="h-3.5 w-3.5" /> Reveal</button>
          )}
        </div>
        {field.sensitive && !creating && revealedValue === undefined ? (
          <div className="flex min-h-10 items-center rounded-xl border border-amber-400/15 bg-amber-400/5 px-3 text-sm text-amber-100/70">Protected information</div>
        ) : editable ? (
          referenceResource(field.name) ? <ReferenceInput key={`${row?._admin_id || "new"}:${field.name}`} field={field} value={values[field.name]} initialLabel={reference?.label} onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))} />
            : <FieldInput field={field} value={values[field.name]} onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))} />
        ) : (
          <div className="min-h-10 break-words rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2 text-sm text-slate-200">
            {reference ? <button onClick={() => onOpenReference(reference)} className="inline-flex items-center gap-1.5 font-medium text-blue-200 hover:text-blue-100 hover:underline"><span>{reference.label}</span><ArrowUpRight className="h-3.5 w-3.5" /></button> : <AdminDisplayValue value={revealedValue ?? row?.[field.name]} field={field} />}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/55 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${creating ? "Create" : "View"} ${label}`}>
      <button className="min-w-0 flex-1 cursor-default" onClick={onClose} aria-label="Close record panel" />
      <aside className="flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-slate-950/95 shadow-2xl shadow-black/50">
        <header className="flex items-start justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-blue-300">{label}</div>
            <h2 className="mt-1 text-xl font-semibold text-white">{creating ? `Create ${singular(label)}` : recordTitle(row!)}</h2>
            {!creating && <p className="mt-1 max-w-lg truncate text-xs text-slate-500">Record ID · {row?._admin_id}</p>}
          </div>
          <div className="flex items-center gap-2">
            {!creating && actions.includes("update") && !editing && <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"><Pencil className="h-4 w-4" /> Edit</button>}
            <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close"><X className="h-5 w-5" /></button>
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {!creating && onOpenAccount && (
            <button onClick={() => onOpenAccount(row!)} className="flex w-full items-center justify-between rounded-2xl border border-blue-400/25 bg-blue-500/10 px-4 py-3 text-left text-blue-100 hover:bg-blue-500/15"><span className="flex items-center gap-3"><UserRoundCog className="h-5 w-5" /><span><span className="block text-sm font-medium">Open account management</span><span className="mt-0.5 block text-xs text-slate-400">See this user’s profile, projects, content, utilities, integrations, devices, and activity.</span></span></span><ArrowUpRight className="h-4 w-4 shrink-0" /></button>
          )}
          {lockedMessage && <div className="rounded-2xl border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-sm leading-6 text-amber-100"><div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><span>{lockedMessage}</span></div></div>}
          <div className="grid gap-4 sm:grid-cols-2">
            {primaryFields.map(renderField)}
          </div>

          {secondaryFields.length > 0 && (
            <details className="rounded-2xl border border-white/10 bg-white/[0.018] p-4">
              <summary className="cursor-pointer text-sm font-medium text-slate-300">Technical details <span className="ml-1 text-xs font-normal text-slate-500">({secondaryFields.length})</span></summary>
              <div className="mt-4 grid gap-4 border-t border-white/8 pt-4 sm:grid-cols-2">{secondaryFields.map(renderField)}</div>
            </details>
          )}

          {!creating && actions.includes("reset-password") && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-white"><KeyRound className="h-4 w-4 text-blue-300" /> Temporary password reset</div>
              <p className="mt-1 text-xs text-slate-400">The account will be blocked from the app until this password is replaced.</p>
              <div className="mt-3 flex gap-2">
                <input type="password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} placeholder="At least 12 characters" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />
                <button disabled={temporaryPassword.length < 12} onClick={() => onOperation("reset-password", { temporary_password: temporaryPassword })} className="rounded-xl border border-blue-400/25 bg-blue-500/10 px-3 py-2 text-sm text-blue-100 disabled:opacity-40">Review reset</button>
              </div>
            </section>
          )}

          {!creating && <GuidedActions actions={actions} row={row!} onOperation={onOperation} />}
        </div>

        {(creating || editing) && (
          <footer className="flex items-center justify-between gap-3 border-t border-white/10 bg-black/15 px-5 py-4">
            <button onClick={() => creating ? onClose() : setEditing(false)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300">Cancel</button>
            <button disabled={!creating && Object.keys(changed).length === 0} onClick={() => onOperation(creating ? "create" : "update", changed)} className="inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/15 px-4 py-2 text-sm font-medium text-blue-100 disabled:opacity-40"><Save className="h-4 w-4" /> Review {creating ? "creation" : "changes"}</button>
          </footer>
        )}
      </aside>
    </div>
  );
}

function GuidedActions({ actions, row, onOperation }: { actions: string[]; row: AdminRow; onOperation: Props["onOperation"] }) {
  const isBanned = !!row.banned_until && new Date(String(row.banned_until)).getTime() > Date.now();
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Administrative actions</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {!row.app_admin && actions.includes("request-admin") && <ActionButton icon={ShieldCheck} label="Request admin access" onClick={() => onOperation("request-admin")} />}
        {row.app_admin === true && row.app_owner !== true && actions.includes("revoke-admin") && <ActionButton icon={ShieldOff} label="Remove admin access" onClick={() => onOperation("revoke-admin")} destructive />}
        {row.status === "pending" && actions.includes("approve-admin") && <ActionButton icon={ShieldCheck} label="Approve admin access" onClick={() => onOperation("approve-admin")} />}
        {row.status === "pending" && actions.includes("reject-admin") && <ActionButton icon={XCircle} label="Reject request" onClick={() => onOperation("reject-admin")} destructive />}
        {actions.includes(isBanned ? "unban" : "ban") && <ActionButton icon={isBanned ? UserCheck : Ban} label={isBanned ? "Unban account" : "Ban account"} onClick={() => onOperation(isBanned ? "unban" : "ban")} destructive={!isBanned} />}
        {actions.includes("regenerate-code") && <ActionButton icon={RotateCcw} label="Regenerate code" onClick={() => onOperation("regenerate-code")} />}
        {actions.includes("transfer-owner") && <TransferOwner onSubmit={(ownerId) => onOperation("transfer-owner", { owner_id: ownerId })} />}
        {actions.includes("cancel") && <ActionButton icon={ShieldOff} label="Cancel pairing" onClick={() => onOperation("cancel")} />}
        {actions.includes("revoke") && <ActionButton icon={ShieldOff} label="Revoke device" onClick={() => onOperation("revoke")} destructive />}
        {actions.includes("delete") && <ActionButton icon={Trash2} label="Delete permanently" onClick={() => onOperation("delete")} destructive />}
      </div>
    </section>
  );
}

function TransferOwner({ onSubmit }: { onSubmit: (id: string) => void }) {
  const [ownerId, setOwnerId] = useState("");
  return <div className="w-full rounded-xl border border-white/8 bg-black/10 p-3"><div className="mb-2 text-xs text-slate-400">Transfer ownership to</div><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><ReferenceInput field={{ name: "owner_id", label: "New owner", type: "text" }} value={ownerId} onChange={(value) => setOwnerId(String(value || ""))} /></div><button disabled={!ownerId.trim()} onClick={() => onSubmit(ownerId.trim())} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 disabled:opacity-40">Review transfer</button></div></div>;
}

function ActionButton({ icon: Icon, label, onClick, destructive = false }: { icon: typeof Ban; label: string; onClick: () => void; destructive?: boolean }) {
  return <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${destructive ? "border-red-400/25 bg-red-400/5 text-red-200" : "border-white/10 text-slate-200 hover:bg-white/5"}`}><Icon className="h-4 w-4" /> {label}</button>;
}

function FieldInput({ field, value, onChange }: { field: AdminField; value: unknown; onChange: (value: unknown) => void }) {
  const classes = "w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/50";
  if (field.type === "boolean") return <label className="flex min-h-10 items-center gap-3 rounded-xl border border-white/10 bg-slate-900/80 px-3 text-sm text-slate-200"><input type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} className="accent-blue-500" /> Enabled</label>;
  if (field.type === "select") return <select value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} className={classes}><option value="">Select…</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
  if (field.type === "textarea" || field.type === "json") return <textarea rows={field.type === "json" ? 7 : 5} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} className={`${classes} ${field.type === "json" ? "font-mono" : ""}`} />;
  const type = field.name.includes("password") ? "password" : field.type === "number" ? "number" : field.type === "datetime" ? "datetime-local" : field.type;
  return <input type={type} value={formatInputValue(value, field.type)} onChange={(event) => onChange(event.target.value)} className={classes} />;
}

export function ReferenceInput({ field, value, initialLabel, onChange }: { field: AdminField; value: unknown; initialLabel?: string; onChange: (value: unknown) => void }) {
  const resource = referenceResource(field.name)!;
  const [query, setQuery] = useState(initialLabel || "");
  const [options, setOptions] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [chosen, setChosen] = useState(!!value && !!initialLabel);

  useEffect(() => {
    const text = query.trim();
    if (chosen || text.length < 2) { setOptions([]); return; }
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await loadAdminResource({ resource, page: 1, pageSize: 8, search: text });
        if (active) setOptions(response.rows);
      } catch {
        if (active) setOptions([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [chosen, query, resource]);

  return <div className="relative">
    <input value={query} placeholder={`Search ${adminFieldLabel(field).toLowerCase()} by name…`} onChange={(event) => { setQuery(event.target.value); setChosen(false); onChange(""); }} className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/50" />
    {loading && <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-slate-500">Searching…</span>}
    {!chosen && options.length > 0 && <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-white/10 bg-slate-900 p-1 shadow-2xl">
      {options.map((option) => <button key={option._admin_id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setQuery(optionLabel(option)); setChosen(true); setOptions([]); onChange(option._admin_id); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-blue-500/15 hover:text-white">{optionLabel(option)}</button>)}
    </div>}
    {!chosen && query.trim().length > 0 && !loading && <p className="mt-1 text-xs text-slate-500">Choose a matching record from the search results.</p>}
  </div>;
}

function referenceResource(fieldName: string) {
  return ({
    user_id: "users", owner_id: "users", actor_id: "users",
    org_id: "organizations", organization_id: "organizations",
    project_id: "projects", column_id: "project-board-columns",
    folder_id: "quicklink-folders", device_id: "launcher-devices",
    parent_id: "project-files",
  } as Record<string, string>)[fieldName];
}

function optionLabel(row: AdminRow) {
  const primary = recordTitle(row);
  const email = String(row.email || "").trim();
  return email && email.toLowerCase() !== primary.toLowerCase() ? `${primary} · ${email}` : primary;
}

function formatInputValue(value: unknown, type: string) {
  if (value == null) return "";
  if (type === "datetime") {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 16);
  }
  return String(value);
}

function defaultValue(field: AdminField) {
  if (field.type === "boolean") return false;
  if (field.type === "number") return 0;
  if (field.type === "json") return "[]";
  if (field.name === "role") return "member";
  return "";
}

function recordTitle(row: AdminRow) {
  for (const key of ["display_name", "name", "title", "email", "device_name", "code", "slug", "plugin_id"]) {
    if (row[key]) return String(row[key]);
  }
  return String(row._admin_id);
}

function singular(label: string) {
  return label.endsWith("ies") ? `${label.slice(0, -3)}y` : label.endsWith("s") ? label.slice(0, -1) : label;
}

function isSecondaryField(field: AdminField) {
  if (field.type === "json") return true;
  return [
    "metadata", "meta", "device_identifier", "icon", "favicon_url", "scopes",
    "dorm_lat", "dorm_lng", "location_lat", "location_lng", "position",
    "sort_index", "sort_order", "order_index",
  ].includes(field.name);
}
