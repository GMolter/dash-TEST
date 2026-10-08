import { useState } from 'react';
import { exportQuicklinkBundle, parseQuicklinkBundle, QUICKLINK_LIMIT, type QuicklinkBundle } from '../../../shared/quicklinkBundle';
import { ReferenceInput } from './AdminRecordDrawer';
import type { AdminOperation, AdminRow } from './types';

type Clipboard = { source: string; label: string; mode: 'copy' | 'move'; folder_ids: string[]; link_ids: string[]; count: number };
// Memory only: survives account navigation, but never persists another account's data to disk.
let clipboard: Clipboard | null = null;
type Draft = { mode: 'copy' | 'move' | 'edit' | 'import'; source?: Clipboard; bundle?: QuicklinkBundle; count: number; hasFolders: boolean };
type Props = {
  user: AdminRow; folders: AdminRow[]; links: AdminRow[]; selected: Set<string>;
  onSelect: (ids: Set<string>) => void; onOperation: (operation: Omit<AdminOperation, 'reason'>) => void;
};
export function clearQuicklinkCutClipboard() { if (clipboard?.mode === 'move') clipboard = null; }
export function AdminQuicklinkBulkTools({ user, folders, links, selected, onSelect, onOperation }: Props) {
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [target, setTarget] = useState(user._admin_id);
  const [destination, setDestination] = useState('');
  const [scope, setScope] = useState('');
  const [icon, setIcon] = useState('');
  const [changeIcon, setChangeIcon] = useState(false);
  const selectedFolders = folders.filter(f => selected.has(`folder:${f._admin_id}`));
  const folderIds = new Set(selectedFolders.map(f => f._admin_id));
  const selectedLinks = links.filter(l => selected.has(`link:${l._admin_id}`) || folderIds.has(String(l.folder_id)));
  const count = selectedFolders.length + selectedLinks.length;
  const allowed = count > 0 && count <= QUICKLINK_LIMIT;
  const button = 'rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-40';
  function selection(mode: 'copy' | 'move'): Clipboard {
    return { source: user._admin_id, label: String(user.display_name || user.email || 'this account'), mode, folder_ids: [...folderIds], link_ids: selectedLinks.map(l => l._admin_id), count };
  }
  function open(next: Draft) {
    setDraft(next); setTarget(user._admin_id); setDestination(''); setScope(''); setIcon(''); setChangeIcon(false); setError('');
  }
  function capture(mode: 'copy' | 'move') {
    clipboard = selection(mode);
    setNotice(`${count} items ${mode === 'copy' ? 'copied' : 'cut'}. Open the destination account and choose Paste, or choose Paste here to select a profile. Cut items stay in place until the move succeeds.`);
  }
  function exportItems() {
    const bundle = exportQuicklinkBundle(selectedFolders, selectedLinks);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    if (blob.size > 1_000_000) { setError('This export exceeds 1 MB. Select fewer items so it can be imported again.'); return; }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'olio-quicklinks.json'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error('Choose a JSON file smaller than 1 MB.');
      const bundle = parseQuicklinkBundle(JSON.parse(await file.text()));
      open({ mode: 'import', bundle, count: bundle.folders.length + bundle.links.length, hasFolders: bundle.folders.length > 0 });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not import this file.'); }
  }
  function review() {
    if (!draft) return;
    onOperation({ resource: 'quicklinks', kind: 'bulk-quicklinks', values: {
      mode: draft.mode, source_user_id: draft.source?.source || user._admin_id, target_user_id: draft.mode === 'edit' ? user._admin_id : target,
      folder_ids: draft.source?.folder_ids || [...folderIds], link_ids: draft.source?.link_ids || selectedLinks.map(l => l._admin_id),
      ...(draft.mode !== 'edit' ? { destination_folder_id: destination || null } : {}),
      ...(draft.bundle ? { bundle: draft.bundle } : {}),
      ...(draft.mode === 'edit' ? { patch: { ...(scope ? { scope } : {}), ...(changeIcon ? { icon } : {}) } } : {}),
    } });
    setDraft(null);
  }
  return <div className="space-y-3 border-b border-white/10 p-4">
    <div className="flex flex-wrap items-center gap-2">
      <button className={button} onClick={() => onSelect(new Set([...folders.map(f => `folder:${f._admin_id}`), ...links.map(l => `link:${l._admin_id}`)]))}>Select all</button>
      <button className={button} disabled={!selected.size} onClick={() => onSelect(new Set())}>Clear selection</button>
      <span className="text-sm text-slate-400">{count} selected, including folder contents</span>
      <button className={button} disabled={!allowed} onClick={() => capture('copy')}>Copy</button>
      <button className={button} disabled={!allowed} onClick={() => capture('move')}>Cut</button>
      <button className={button} disabled={!clipboard} onClick={() => { if (clipboard) open({ mode: clipboard.mode, source: clipboard, count: clipboard.count, hasFolders: !!clipboard.folder_ids.length }); }}>Paste</button>
      <button className={button} disabled={!allowed} onClick={() => open({ mode: 'move', source: selection('move'), count, hasFolders: !!folderIds.size })}>Move to…</button>
      <button className={button} disabled={!allowed} onClick={() => open({ mode: 'edit', count, hasFolders: !!folderIds.size })}>Bulk edit</button>
      <button className={button} disabled={!allowed} onClick={exportItems}>Export selected</button>
      <label className={`${button} cursor-pointer`}>Import JSON<input aria-label="Import quicklinks JSON" className="sr-only" type="file" accept=".json,application/json" onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }} /></label>
    </div>
    {count > QUICKLINK_LIMIT && <p role="alert" className="text-sm text-amber-200">Choose at most {QUICKLINK_LIMIT} items, including folder contents.</p>}
    {notice && <p role="status" className="text-sm text-blue-200">{notice}</p>}
    {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
    {draft && <div role="dialog" aria-modal="true" aria-labelledby="bulk-links-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4">
      <form className="w-full max-w-lg space-y-4 rounded-2xl border border-white/15 bg-slate-950 p-6" onSubmit={e => { e.preventDefault(); review(); }}>
        <h3 id="bulk-links-title" className="text-lg font-semibold capitalize">{draft.mode} {draft.count} items</h3>
        {draft.source && <p className="text-sm text-slate-300">From {draft.source.label}. Selected folders include every contained link.</p>}
        {draft.mode === 'edit' ? <>
          <p className="text-sm text-slate-400">Apply common fields to all selected folders and links. Use each item's pencil to change its name or URL.</p>
          <label className="block text-sm">Scope<select aria-label="Bulk scope" className="ml-3 rounded bg-slate-800 p-2" value={scope} onChange={e => setScope(e.target.value)}><option value="">Keep current scope</option><option value="personal">Personal</option><option value="shared">Shared</option><option value="both">Both</option></select></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={changeIcon} onChange={e => setChangeIcon(e.target.checked)} />Change icon for all selected items</label>
          {changeIcon && <input aria-label="Bulk icon" className="w-full rounded bg-slate-800 p-2" maxLength={1000} value={icon} onChange={e => setIcon(e.target.value)} placeholder="Icon (leave empty to clear)" />}
        </> : <>
          <label className="block text-sm">Destination profile<ReferenceInput field={{ name: 'user_id', label: 'Destination profile', type: 'text' }} value={target} initialLabel={target === user._admin_id ? String(user.display_name || user.email) : undefined} onChange={value => { setTarget(String(value || '')); setDestination(''); }} /></label>
          {!draft.hasFolders && <label className="block text-sm">Destination folder (empty = account root)<ReferenceInput key={target} field={{ name: 'folder_id', label: 'Destination folder', type: 'text' }} value={destination} accountUserId={target || undefined} onChange={value => setDestination(String(value || ''))} /></label>}
          <p className="text-sm text-slate-400">{draft.hasFolders ? 'Folders and their links are placed at the destination account root. ' : ''}Imports and transfers between profiles use personal visibility. Existing destination items are kept; copies and imports create new items.</p>
        </>}
        <div className="flex justify-end gap-2"><button type="button" className={button} onClick={() => setDraft(null)}>Cancel</button><button className={button} disabled={draft.mode === 'edit' ? !scope && !changeIcon : !target}>Review bulk action</button></div>
      </form>
    </div>}
  </div>;
}
