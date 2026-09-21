import { useEffect, useState } from "react";
import { ChevronDown, Folder, Link, Pencil, Plus, Search } from "lucide-react";
import { loadAdminResource } from "./api";
import { AdminRecordDrawer } from "./AdminRecordDrawer";
import { AdminOperationDialog } from "./AdminOperationDialog";
import type { AdminListResponse, AdminOperation, AdminReference, AdminRow } from "./types";

type Props = { user: AdminRow; onComplete: () => void; onOpenReference: (reference: AdminReference) => void };
type Editor = { data: AdminListResponse; row: AdminRow | null; defaults?: Record<string, unknown> };

// Fetch every page so a folder never appears empty merely because its links are on another page.
async function loadCollection(resource: string, accountUserId: string) {
  const first = await loadAdminResource({ resource, accountUserId, page: 1, pageSize: 100, search: "", sort: "order_index", direction: "asc" });
  const rows = [...first.rows];
  for (let page = 2; rows.length < first.total; page++) {
    const next = await loadAdminResource({ resource, accountUserId, page, pageSize: first.pageSize, search: "", sort: "order_index", direction: "asc" });
    if (!next.rows.length) throw new Error("The collection changed while loading. Please retry.");
    rows.push(...next.rows);
  }
  return { ...first, rows };
}

export function AdminAccountQuicklinks({ user, onComplete, onOpenReference }: Props) {
  const [collections, setCollections] = useState<AdminListResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editor, setEditor] = useState<Editor | null>(null);
  const [pending, setPending] = useState<Omit<AdminOperation, "reason"> | null>(null);
  useEffect(() => {
    let active = true;
    setCollections(null);
    setError(null);
    Promise.all([loadCollection("quicklinks", user._admin_id), loadCollection("quicklink-folders", user._admin_id)])
      .then((result) => { if (active) setCollections(result); })
      .catch((failure) => { if (active) setError(failure instanceof Error ? failure.message : "Could not load quick links."); });
    return () => { active = false; };
  }, [user, revision]);

  if (error) return <div role="alert" className="rounded-2xl border border-red-400/20 p-5 text-red-200">{error}<button className="ml-3 underline" onClick={() => setRevision((value) => value + 1)}>Retry</button></div>;
  if (!collections) return <p className="p-5 text-slate-400">Loading links and folders…</p>;
  const [links, folders] = collections;
  const query = search.trim().toLowerCase();
  const matches = (item: AdminRow) => `${item.title || item.name || ""} ${item.url || ""}`.toLowerCase().includes(query);
  const folderIds = new Set(folders.rows.map((folder) => folder._admin_id));
  const roots = [
    ...folders.rows.map((row) => ({ row, folder: true })),
    ...links.rows.filter((row) => !row.folder_id || !folderIds.has(String(row.folder_id))).map((row) => ({ row, folder: false })),
  ].sort((a, b) => Number(a.row.order_index || 0) - Number(b.row.order_index || 0) || a.row._admin_id.localeCompare(b.row._admin_id));
  const visible = roots.filter(({ row, folder }) => matches(row) || (folder && links.rows.some((link) => link.folder_id === row._admin_id && matches(link))));

  function create(data: AdminListResponse, folder?: AdminRow) {
    setEditor({ data, row: null, defaults: {
      user_id: user._admin_id, org_id: user.org_id || "", scope: folder?.scope || "personal",
      folder_id: folder?._admin_id || "", order_index: Math.max(-1, ...data.rows.map((row) => Number(row.order_index || 0))) + 1,
    } });
  }
  function linkRow(row: AdminRow) {
    return <div key={row._admin_id} className="flex min-w-0 items-center gap-3 px-4 py-4">
      <Link className="h-5 w-5 shrink-0 text-blue-300" />
      <button className="min-w-0 flex-1 text-left" onClick={() => setEditor({ data: links, row })}><span className="block truncate text-sm font-medium text-white">{String(row.title || "Untitled link")}</span><span className="block truncate text-xs text-slate-400">{String(row.url || "No URL")}</span>{Boolean(row.folder_id) && !folderIds.has(String(row.folder_id)) && <span className="text-xs text-amber-200">Folder outside this account view</span>}</button>
      <span className="text-xs capitalize text-slate-400">{String(row.scope || "personal")}</span>
      <button aria-label={`Manage ${row.title}`} onClick={() => setEditor({ data: links, row })} className="rounded-lg p-2 hover:bg-white/10"><Pencil className="h-4 w-4" /></button>
    </div>;
  }
  return <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/45">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
      <div><h3 className="font-semibold">Quick links & folders</h3><p className="mt-1 text-xs text-slate-400">{links.total} links · {folders.total} folders</p></div>
      <div className="flex gap-2">{folders.actions.includes("create") && <button className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm" onClick={() => create(folders)}><Folder className="h-4 w-4" /> Add folder</button>}{links.actions.includes("create") && <button className="inline-flex items-center gap-2 rounded-lg bg-blue-500/15 px-3 py-2 text-sm text-blue-100" onClick={() => create(links)}><Plus className="h-4 w-4" /> Add quick link</button>}</div>
    </div>
    <label className="m-4 flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input aria-label="Search links and folders" placeholder="Search links and folders…" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent text-sm outline-none" /></label>
    <div className="divide-y divide-white/10">{visible.map(({ row, folder }) => {
      if (!folder) return linkRow(row);
      const children = links.rows.filter((link) => link.folder_id === row._admin_id);
      const open = expanded.has(row._admin_id) || Boolean(query);
      return <article key={row._admin_id}>
        <div className="flex flex-wrap items-center gap-3 px-4 py-4">
          <button aria-expanded={open} aria-label={`${open ? "Collapse" : "Expand"} ${row.name}`} className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(row._admin_id)) next.delete(row._admin_id); else next.add(row._admin_id); return next; })}>
            <Folder className="h-6 w-6 shrink-0 text-amber-200" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{String(row.name)}</span><span className="text-xs text-slate-400">{children.length} links · {String(row.scope || "personal")}</span></span><ChevronDown className={`h-4 w-4 ${open ? "rotate-180" : ""}`} />
          </button>
          {links.actions.includes("create") && <button aria-label={`Add link to ${row.name}`} className="rounded-lg p-2 hover:bg-white/10" onClick={() => create(links, row)}><Plus className="h-4 w-4" /></button>}
          <button aria-label={`Manage folder ${row.name}`} className="rounded-lg p-2 hover:bg-white/10" onClick={() => setEditor({ data: folders, row })}><Pencil className="h-4 w-4" /></button>
        </div>
        {open && <div className="ml-6 border-l border-white/10 bg-white/[0.02] sm:ml-10">{children.filter((link) => matches(row) || matches(link)).map(linkRow)}{!children.length && <p className="px-4 py-5 text-sm text-slate-500">Empty folder. Add a link using the + button above.</p>}</div>}
      </article>;
    })}</div>
    {!visible.length && <p className="p-8 text-center text-sm text-slate-400">{query ? "No matching links or folders." : "No links or folders yet. Add a folder or quick link to get started."}</p>}
    {editor && <AdminRecordDrawer label={editor.data.label} fields={editor.data.fields} actions={editor.data.actions} row={editor.row} creating={!editor.row} initialValues={editor.defaults} accountUserId={user._admin_id} initialLabels={{ user_id: String(user.display_name || user.email), org_id: user._admin_refs?.org_id?.label || "", folder_id: String(folders.rows.find((folder) => folder._admin_id === editor.defaults?.folder_id)?.name || "") }} revealed={{}} onClose={() => setEditor(null)} onReveal={() => undefined} onOpenReference={onOpenReference} onOperation={(kind, values) => setPending({ resource: editor.data.resource, kind, ids: editor.row ? [editor.row._admin_id] : undefined, values })} />}
    <AdminOperationDialog operation={pending} title={`${pending?.kind === "create" ? "Create" : pending?.kind === "delete" ? "Delete" : "Update"} ${editor?.data.label || "quick links"}`} onCancel={() => setPending(null)} onComplete={() => { setPending(null); setEditor(null); setRevision((value) => value + 1); onComplete(); }} />
  </section>;
}
