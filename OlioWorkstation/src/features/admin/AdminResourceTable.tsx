import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsUpDown, Database, Filter, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import type { AdminField, AdminListResponse, AdminRow } from "./types";

type Props = {
  data: AdminListResponse | null;
  loading: boolean;
  search: string;
  filters: Record<string, unknown>;
  selected: Set<string>;
  onSearch: (value: string) => void;
  onFilters: (value: Record<string, unknown>) => void;
  onSelection: (next: Set<string>) => void;
  onOpen: (row: AdminRow) => void;
  onCreate: () => void;
  onPage: (page: number) => void;
  onSort: (field: string) => void;
  onBulkDelete: () => void;
  onBulkUpdate: (field: string, value: unknown) => void;
};

export function AdminResourceTable({ data, loading, search, filters, selected, onSearch, onFilters, onSelection, onOpen, onCreate, onPage, onSort, onBulkDelete, onBulkUpdate }: Props) {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkField, setBulkField] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterField, setFilterField] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const columns = useMemo(() => chooseColumns(data?.fields || []), [data?.fields]);
  const rows = data?.rows || [];
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row._admin_id));
  const editableFields = data?.fields.filter((field) => field.editable && !field.sensitive && ["text", "number", "boolean", "select"].includes(field.type)) || [];
  const bulkAllowed = !!data && !["users", "organizations", "launcher-devices", "launcher-pairings", "calendar-connections", "app-settings", "audit-log", "project-activity"].includes(data.resource);
  const pageCount = Math.max(1, Math.ceil((data?.total || 0) / (data?.pageSize || 25)));

  function toggleAll() {
    if (allSelected) onSelection(new Set());
    else onSelection(new Set(rows.map((row) => row._admin_id)));
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelection(next);
  }

  function submitBulkUpdate() {
    if (!bulkField) return;
    const field = editableFields.find((item) => item.name === bulkField);
    const value = field?.type === "boolean" ? bulkValue === "true" : field?.type === "number" ? Number(bulkValue) : bulkValue;
    onBulkUpdate(bulkField, value);
    setBulkOpen(false);
  }

  function applyFilter() {
    const field = data?.fields.find((item) => item.name === filterField);
    if (!field || filterValue === "") return;
    const value = field.type === "boolean" ? filterValue === "true" : field.type === "number" ? Number(filterValue) : filterValue;
    onFilters({ ...filters, [filterField]: value });
    setFilterValue("");
    setFilterOpen(false);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/45 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
        <div className="relative min-w-[220px] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder={`Search ${data?.label || "records"}…`}
            className="w-full rounded-xl border border-white/10 bg-slate-900/70 py-2 pl-9 pr-9 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-400/50" />
          {search && <button onClick={() => onSearch("")} className="absolute right-2 top-2 rounded p-1 text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-500">{data ? `${data.total.toLocaleString()} records` : ""}</div>
          {!!data?.filterFields.length && <button onClick={() => setFilterOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-sm text-slate-300 hover:bg-white/5"><Filter className="h-4 w-4" /> Filter</button>}
          {data?.actions.includes("create") && <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/15 px-3 py-2 text-sm font-medium text-blue-100 hover:bg-blue-500/20"><Plus className="h-4 w-4" /> New</button>}
        </div>
      </div>

      {(filterOpen || Object.keys(filters).length > 0) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-white/[0.018] px-4 py-3">
          {Object.entries(filters).map(([name, value]) => (
            <button key={name} onClick={() => onFilters(Object.fromEntries(Object.entries(filters).filter(([key]) => key !== name)))} className="inline-flex items-center gap-1 rounded-lg border border-blue-400/20 bg-blue-500/10 px-2.5 py-1.5 text-xs text-blue-100">
              {data?.fields.find((field) => field.name === name)?.label || name}: {String(value)} <X className="h-3 w-3" />
            </button>
          ))}
          {filterOpen && <>
            <select value={filterField} onChange={(event) => { setFilterField(event.target.value); setFilterValue(""); }} className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">
              <option value="">Choose field…</option>
              {data?.filterFields.map((name) => <option key={name} value={name}>{data.fields.find((field) => field.name === name)?.label || name}</option>)}
            </select>
            {data?.fields.find((field) => field.name === filterField)?.type === "boolean" ? (
              <select value={filterValue} onChange={(event) => setFilterValue(event.target.value)} className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"><option value="">Choose value…</option><option value="true">Yes</option><option value="false">No</option></select>
            ) : <input value={filterValue} onChange={(event) => setFilterValue(event.target.value)} placeholder="Exact value" className="min-w-44 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />}
            <button disabled={!filterField || filterValue === ""} onClick={applyFilter} className="rounded-lg border border-blue-400/25 bg-blue-500/10 px-3 py-2 text-sm text-blue-100 disabled:opacity-40">Apply</button>
          </>}
          {Object.keys(filters).length > 0 && <button onClick={() => onFilters({})} className="ml-auto text-xs text-slate-400 hover:text-white">Clear filters</button>}
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-400/20 bg-blue-500/8 px-4 py-3">
          <div className="text-sm font-medium text-blue-100">{selected.size} selected</div>
          <div className="flex items-center gap-2">
            {bulkAllowed && data?.actions.includes("update") && editableFields.length > 0 && <button onClick={() => setBulkOpen((value) => !value)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5">Bulk update</button>}
            {bulkAllowed && data?.actions.includes("delete") && <button onClick={onBulkDelete} className="inline-flex items-center gap-1 rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-1.5 text-xs text-red-200"><Trash2 className="h-3.5 w-3.5" /> Delete</button>}
            <button onClick={() => onSelection(new Set())} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10"><X className="h-4 w-4" /></button>
          </div>
          {bulkOpen && (
            <div className="flex w-full flex-wrap gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-3">
              <select value={bulkField} onChange={(event) => setBulkField(event.target.value)} className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"><option value="">Choose field…</option>{editableFields.map((field) => <option key={field.name} value={field.name}>{field.label}</option>)}</select>
              {editableFields.find((field) => field.name === bulkField)?.type === "boolean" ? (
                <select value={bulkValue} onChange={(event) => setBulkValue(event.target.value)} className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"><option value="true">Enabled</option><option value="false">Disabled</option></select>
              ) : <input value={bulkValue} onChange={(event) => setBulkValue(event.target.value)} placeholder="New value" className="min-w-48 flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" />}
              <button disabled={!bulkField} onClick={submitBulkUpdate} className="rounded-lg border border-blue-400/25 bg-blue-500/10 px-3 py-2 text-sm text-blue-100 disabled:opacity-40">Review update</button>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-slate-900/55 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="w-12 px-4 py-3"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all visible records" className="accent-blue-500" /></th>
              {columns.map((field) => <th key={field.name} className="px-3 py-3 font-medium"><button onClick={() => onSort(field.name)} className="inline-flex items-center gap-1 hover:text-slate-200">{field.label}<ChevronsUpDown className="h-3 w-3" /></button></th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {loading ? (
              <tr><td colSpan={columns.length + 1} className="h-56 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-300" /><div className="mt-2 text-sm text-slate-500">Loading records…</div></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={columns.length + 1} className="h-56 text-center"><Database className="mx-auto h-7 w-7 text-slate-600" /><div className="mt-2 text-sm text-slate-500">No records found.</div></td></tr>
            ) : rows.map((row) => (
              <tr key={row._admin_id} className="cursor-pointer text-slate-300 transition hover:bg-blue-400/[0.055]">
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selected.has(row._admin_id)} onChange={() => toggleOne(row._admin_id)} aria-label={`Select ${row._admin_id}`} className="accent-blue-500" /></td>
                {columns.map((field) => <td key={field.name} onClick={() => onOpen(row)} className="max-w-[260px] truncate px-3 py-3">{tableValue(row[field.name], field)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="flex items-center justify-between border-t border-white/10 px-4 py-3">
        <div className="text-xs text-slate-500">Page {data?.page || 1} of {pageCount}</div>
        <div className="flex gap-2">
          <button disabled={!data || data.page <= 1 || loading} onClick={() => onPage((data?.page || 1) - 1)} className="rounded-lg border border-white/10 p-2 text-slate-300 disabled:opacity-30" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
          <button disabled={!data || data.page >= pageCount || loading} onClick={() => onPage((data?.page || 1) + 1)} className="rounded-lg border border-white/10 p-2 text-slate-300 disabled:opacity-30" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </footer>
    </section>
  );
}

function chooseColumns(fields: AdminField[]) {
  const preferred = ["display_name", "email", "name", "title", "device_name", "code", "slug", "status", "role", "app_admin", "owner_id", "user_id", "org_id", "updated_at", "created_at"];
  const safe = fields.filter((field) => !field.sensitive && field.name !== "temporary_password");
  const rank = (name: string) => {
    const index = preferred.indexOf(name);
    return index === -1 ? preferred.length : index;
  };
  return [...safe].sort((a, b) => rank(a.name) - rank(b.name)).slice(0, 6);
}

function tableValue(value: unknown, field: AdminField) {
  if (value === null || value === undefined || value === "") return <span className="text-slate-600">—</span>;
  if (typeof value === "boolean") return <span className={`rounded-full px-2 py-1 text-xs ${value ? "bg-emerald-400/10 text-emerald-200" : "bg-slate-400/10 text-slate-400"}`}>{value ? "Yes" : "No"}</span>;
  if (field.type === "datetime") {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  }
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
