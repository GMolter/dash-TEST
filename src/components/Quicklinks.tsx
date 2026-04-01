import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Pencil, Folder } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOrg } from '../hooks/useOrg';
import { useAuth } from '../hooks/useAuth';

interface Quicklink {
  id: string;
  title: string;
  url: string;
  icon: string;
  order_index: number;
  scope: 'personal' | 'shared' | 'both';
  user_id: string;
  folder_id?: string | null;
}

interface QuicklinkFolder {
  id: string;
  name: string;
  icon: string;
  order_index: number;
}

type GridItem =
  | { itemType: 'folder'; id: string; order_index: number; data: QuicklinkFolder }
  | { itemType: 'link'; id: string; order_index: number; data: Quicklink };

interface Props {
  editMode?: boolean;
}

export function Quicklinks({ editMode = false }: Props) {
  const { user } = useAuth();
  const { organization } = useOrg();

  // ── Data ─────────────────────────────────────────────────────────────────────
  const [links, setLinks] = useState<Quicklink[]>([]);
  const [folders, setFolders] = useState<QuicklinkFolder[]>([]);
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);

  // ── Link form ────────────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingLink, setEditingLink] = useState<Quicklink | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [icon, setIcon] = useState('🔗');
  const [scope, setScope] = useState<'personal' | 'shared' | 'both'>('personal');
  const [linkFolderId, setLinkFolderId] = useState<string>('');

  // ── Folder form ──────────────────────────────────────────────────────────────
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [editingFolder, setEditingFolder] = useState<QuicklinkFolder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderIcon, setFolderIcon] = useState('📁');

  // ── Delete modals ────────────────────────────────────────────────────────────
  const [linkToDelete, setLinkToDelete] = useState<Quicklink | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<QuicklinkFolder | null>(null);

  // ── Drag state ───────────────────────────────────────────────────────────────
  const [dragging, setDragging] = useState<{ id: string; itemType: 'folder' | 'link' } | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  // 'into-folder' only when hovering the CENTER of a folder while dragging a link
  const [dragMode, setDragMode] = useState<'reorder' | 'into-folder'>('reorder');
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggingFolderItem, setDraggingFolderItem] = useState<string | null>(null);
  const [dragOverFolderItemId, setDragOverFolderItemId] = useState<string | null>(null);

  // ── Computed ─────────────────────────────────────────────────────────────────
  const personalLinks = links.filter((l) => l.scope === 'personal' || l.scope === 'both');
  const rootPersonalLinks = personalLinks.filter((l) => !l.folder_id);
  const linksInFolder = (folderId: string) => personalLinks.filter((l) => l.folder_id === folderId);

  const rootLinksForGrid = editMode ? links.filter((l) => !l.folder_id) : rootPersonalLinks;

  const allGridItems: GridItem[] = [
    ...folders.map((f) => ({ itemType: 'folder' as const, id: f.id, order_index: f.order_index, data: f })),
    ...rootLinksForGrid.map((l) => ({ itemType: 'link' as const, id: l.id, order_index: l.order_index, data: l })),
  ].sort((a, b) => a.order_index - b.order_index);

  // ── Load ─────────────────────────────────────────────────────────────────────
  useEffect(() => { loadLinks(); loadFolders(); }, []);

  const loadLinks = async () => {
    const { data, error } = await supabase.from('quicklinks').select('*').order('order_index', { ascending: true });
    if (!error && data) setLinks(data);
  };

  const loadFolders = async () => {
    const { data, error } = await supabase.from('quicklink_folders').select('*').order('order_index', { ascending: true });
    if (!error && data) setFolders(data);
  };

  // ── URL helpers ───────────────────────────────────────────────────────────────
  const looksLikeUrl = (value: string) => {
    const v = (value || '').trim();
    return v.startsWith('http://') || v.startsWith('https://');
  };

  const formatUrl = (raw: string) => {
    const u = (raw || '').trim();
    if (!u) return u;
    return u.startsWith('http://') || u.startsWith('https://') ? u : 'https://' + u;
  };

  const faviconFor = (rawUrl: string) => {
    try {
      const u = new URL(formatUrl(rawUrl));
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(u.hostname)}&sz=64`;
    } catch { return ''; }
  };

  // ── LinkIcon ──────────────────────────────────────────────────────────────────
  const LinkIcon = ({ link, size = 40 }: { link: Quicklink; size?: number }) => {
    const customImg = looksLikeUrl(link.icon) ? link.icon.trim() : '';
    const fallbackEmoji = !looksLikeUrl(link.icon) && (link.icon || '').trim() ? link.icon : '🔗';
    const favicon = faviconFor(link.url);
    const primarySrc = customImg || favicon;
    const [imgOk, setImgOk] = useState(!!primarySrc);

    if (primarySrc && imgOk) {
      return (
        <img src={primarySrc} alt="" width={size} height={size} className="rounded-md" onError={() => setImgOk(false)} />
      );
    }
    return <span className="leading-none" style={{ fontSize: Math.round(size * 0.9) }}>{fallbackEmoji}</span>;
  };

  // ── Link CRUD ─────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setTitle(''); setUrl(''); setIcon('🔗'); setScope('personal'); setLinkFolderId('');
    setShowForm(false); setEditingLink(null);
  };

  const addLink = async () => {
    if (!title || !url || !organization || !user) return;
    const { error } = await supabase.from('quicklinks').insert({
      title, url, icon, order_index: links.length,
      org_id: organization.id, user_id: user.id, scope, folder_id: linkFolderId || null,
    });
    if (!error) { resetForm(); loadLinks(); }
  };

  const updateLink = async () => {
    if (!editingLink || !title || !url) return;
    const { error } = await supabase.from('quicklinks')
      .update({ title, url, icon, scope, folder_id: linkFolderId || null })
      .eq('id', editingLink.id);
    if (!error) { resetForm(); loadLinks(); }
  };

  const deleteLink = async () => {
    if (!linkToDelete) return;
    const { error } = await supabase.from('quicklinks').delete().eq('id', linkToDelete.id);
    if (!error) { setLinkToDelete(null); loadLinks(); }
  };

  const startEditLink = (link: Quicklink) => {
    setEditingLink(link); setTitle(link.title); setUrl(link.url);
    setIcon(link.icon || '🔗'); setScope(link.scope || 'personal');
    setLinkFolderId(link.folder_id || ''); setShowForm(true);
  };

  // ── Folder CRUD ───────────────────────────────────────────────────────────────
  const resetFolderForm = () => {
    setFolderName(''); setFolderIcon('📁'); setShowFolderForm(false); setEditingFolder(null);
  };

  const addFolder = async () => {
    if (!folderName || !organization || !user) return;
    const { error } = await supabase.from('quicklink_folders').insert({
      name: folderName, icon: folderIcon,
      order_index: allGridItems.length,
      org_id: organization.id, user_id: user.id,
    });
    if (!error) { resetFolderForm(); loadFolders(); }
  };

  const updateFolder = async () => {
    if (!editingFolder || !folderName) return;
    const { error } = await supabase.from('quicklink_folders')
      .update({ name: folderName, icon: folderIcon })
      .eq('id', editingFolder.id);
    if (!error) { resetFolderForm(); loadFolders(); }
  };

  const startEditFolder = (folder: QuicklinkFolder) => {
    setEditingFolder(folder); setFolderName(folder.name); setFolderIcon(folder.icon || '📁');
    setShowFolderForm(true);
  };

  const deleteFolder = async (strategy: 'root' | 'delete') => {
    if (!folderToDelete) return;
    if (strategy === 'root') {
      await supabase.from('quicklinks').update({ folder_id: null }).eq('folder_id', folderToDelete.id);
    } else {
      await supabase.from('quicklinks').delete().eq('folder_id', folderToDelete.id);
    }
    await supabase.from('quicklink_folders').delete().eq('id', folderToDelete.id);
    if (expandedFolderId === folderToDelete.id) setExpandedFolderId(null);
    setFolderToDelete(null);
    loadLinks(); loadFolders();
  };

  // ── Drag & drop ───────────────────────────────────────────────────────────────
  const moveItem = <T,>(arr: T[], from: number, to: number): T[] => {
    const copy = [...arr];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  };

  const persistUnifiedOrder = async (reordered: GridItem[]) => {
    setSavingOrder(true);
    const newIndexMap = new Map(reordered.map((item, idx) => [item.id, idx]));
    setFolders((prev) => prev.map((f) => ({ ...f, order_index: newIndexMap.get(f.id) ?? f.order_index })));
    setLinks((prev) => prev.map((l) => ({ ...l, order_index: newIndexMap.get(l.id) ?? l.order_index })));
    try {
      await Promise.all(
        reordered.map((item, idx) =>
          supabase.from(item.itemType === 'folder' ? 'quicklink_folders' : 'quicklinks')
            .update({ order_index: idx }).eq('id', item.id)
        )
      );
    } catch {
      loadLinks(); loadFolders();
    } finally {
      setSavingOrder(false);
    }
  };

  const onDragStart = (id: string, itemType: 'folder' | 'link') => (e: React.DragEvent) => {
    setDragging({ id, itemType });
    setDragOverId(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${itemType}:${id}`);
    try { e.dataTransfer.setDragImage(e.currentTarget as HTMLElement, 0, 0); } catch {}
  };

  const onDragOver = (id: string, targetItemType: 'folder' | 'link') => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverId(id);

    // Only a link being dragged over a folder can trigger 'into-folder' mode
    if (dragging?.itemType === 'link' && targetItemType === 'folder') {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      setDragMode(relX > 0.25 && relX < 0.75 ? 'into-folder' : 'reorder');
    } else {
      setDragMode('reorder');
    }

    e.dataTransfer.dropEffect = 'move';
  };

  const onDropOn = (targetId: string, targetItemType: 'folder' | 'link') => async (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    const dragId = dragging?.id ?? raw.split(':')[1];
    const dragItemType = dragging?.itemType ?? (raw.split(':')[0] as 'folder' | 'link');

    setDragging(null); setDragOverId(null);

    if (!dragId || dragId === targetId) return;

    // Drop link INTO folder
    if (dragMode === 'into-folder' && targetItemType === 'folder' && dragItemType === 'link') {
      setDragMode('reorder');
      setLinks((prev) => prev.map((l) => l.id === dragId ? { ...l, folder_id: targetId } : l));
      await supabase.from('quicklinks').update({ folder_id: targetId }).eq('id', dragId);
      return;
    }

    setDragMode('reorder');

    // Reorder
    const fromIdx = allGridItems.findIndex((i) => i.id === dragId);
    const toIdx = allGridItems.findIndex((i) => i.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;

    await persistUnifiedOrder(moveItem(allGridItems, fromIdx, toIdx));
  };

  const onDragEnd = () => { setDragging(null); setDragOverId(null); setDragMode('reorder'); };

  // ── Folder-item reorder ───────────────────────────────────────────────────────
  const persistFolderOrder = async (folderId: string, reordered: Quicklink[]) => {
    setLinks((prev) => prev.map((l) => {
      const idx = reordered.findIndex((r) => r.id === l.id);
      return idx >= 0 ? { ...l, order_index: idx } : l;
    }));
    await Promise.all(reordered.map((l, idx) =>
      supabase.from('quicklinks').update({ order_index: idx }).eq('id', l.id)
    ));
  };

  const onFolderItemDragStart = (linkId: string) => (e: React.DragEvent) => {
    setDraggingFolderItem(linkId);
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  };

  const onFolderItemDragOver = (linkId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderItemId(linkId);
  };

  const onFolderItemDrop = (folderId: string, targetId: string) => async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const dragId = draggingFolderItem;
    setDraggingFolderItem(null);
    setDragOverFolderItemId(null);
    if (!dragId || dragId === targetId) return;
    const folderLinks = links.filter((l) => l.folder_id === folderId).sort((a, b) => a.order_index - b.order_index);
    const fromIdx = folderLinks.findIndex((l) => l.id === dragId);
    const toIdx = folderLinks.findIndex((l) => l.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    await persistFolderOrder(folderId, moveItem(folderLinks, fromIdx, toIdx));
  };

  const onFolderItemDragEnd = () => { setDraggingFolderItem(null); setDragOverFolderItemId(null); };

  // ── Shared tile classes ───────────────────────────────────────────────────────
  const tileBase = 'group relative rounded-xl p-6 border flex flex-col items-center justify-center text-center transition-all';

  // ── View mode ─────────────────────────────────────────────────────────────────
  if (!editMode) {
    return (
      <div className="w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {allGridItems.map((item) => {
            if (item.itemType === 'folder') {
              const folder = item.data;
              const isOpen = expandedFolderId === folder.id;
              const contents = linksInFolder(folder.id).sort((a, b) => a.order_index - b.order_index);
              return (
                <div
                  key={`folder-${folder.id}`}
                  className="rounded-xl border border-slate-700/50 bg-slate-800/50 backdrop-blur overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFolderId(isOpen ? null : folder.id)}
                    className={`w-full hover:bg-slate-700/30 transition-colors ${isOpen ? 'flex items-center gap-3 px-4 py-3' : 'flex flex-col items-center justify-center text-center p-6'}`}
                  >
                    <span className={`${isOpen ? 'text-xl shrink-0' : 'mb-3 text-4xl'}`}>{folder.icon}</span>
                    <span className={`text-white font-medium hover:text-blue-400 transition-colors ${isOpen ? 'text-sm' : ''}`}>{folder.name}</span>
                    {!isOpen && <span className="text-xs text-slate-500 mt-1">{contents.length} link{contents.length !== 1 ? 's' : ''}</span>}
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 border-t border-slate-700/50 ql-folder-open">
                      {contents.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          {contents.map((link, i) => (
                            <a
                              key={link.id}
                              href={formatUrl(link.url)}
                              className="ql-pop-in group/inner bg-slate-900/60 hover:bg-slate-700/60 rounded-lg p-3 flex flex-col items-center text-center"
                              style={{ animationDelay: `${i * 30}ms` }}
                            >
                              <div className="mb-2"><LinkIcon link={link} size={28} /></div>
                              <span className="text-white text-xs font-medium group-hover/inner:text-blue-400 transition-colors leading-tight">{link.title}</span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-xs text-center py-4">Empty folder</p>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            // Root link tile
            const link = item.data;
            return (
              <a
                key={`link-${link.id}`}
                href={formatUrl(link.url)}
                className={`${tileBase} bg-slate-800/50 hover:bg-slate-700/50 backdrop-blur border-slate-700/50 hover:border-slate-600`}
              >
                <div className="mb-3"><LinkIcon link={link} size={42} /></div>
                <h3 className="text-white font-medium group-hover:text-blue-400 transition-colors">{link.title}</h3>
              </a>
            );
          })}

          {allGridItems.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400">No quick links yet.</div>
          )}
        </div>
      </div>
    );
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">Quick Links</h2>
          <p className="text-sm text-slate-400">
            Drag to reorder · Drag a link onto a folder to move it in · Click pencil to edit
            {savingOrder ? ' · Saving…' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { resetFolderForm(); setShowFolderForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
          >
            <Folder className="w-4 h-4" />
            Add Folder
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Link
          </button>
        </div>
      </div>

      {/* Folder form */}
      {showFolderForm && (
        <div className="mb-6 p-6 bg-slate-900/50 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">{editingFolder ? 'Edit Folder' : 'Add New Folder'}</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Icon (emoji)</label>
              <input type="text" placeholder="📁" value={folderIcon} onChange={(e) => setFolderIcon(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Name</label>
              <input type="text" placeholder="Folder Name" value={folderName} onChange={(e) => setFolderName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2">
              <button onClick={editingFolder ? updateFolder : addFolder}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors">
                {editingFolder ? 'Update Folder' : 'Add Folder'}
              </button>
              <button onClick={resetFolderForm}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link form */}
      {showForm && (
        <div className="mb-6 p-6 bg-slate-900/50 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">{editingLink ? 'Edit Link' : 'Add New Link'}</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Icon (emoji or image URL)</label>
              <input type="text" placeholder="🔗  or  https://example.com/icon.png" value={icon} onChange={(e) => setIcon(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="mt-2 text-xs text-slate-400">If you keep this as an emoji, Olio will try to show the site favicon automatically.</p>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Title</label>
              <input type="text" placeholder="Link Title" value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">URL</label>
              <input type="url" placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Visibility</label>
              <select value={scope} onChange={(e) => setScope(e.target.value as 'personal' | 'shared' | 'both')}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="personal">Personal - Only you can see this</option>
                <option value="shared">Shared - All organization members can see this</option>
                <option value="both">Both - Visible in personal and shared views</option>
              </select>
            </div>
            {folders.length > 0 && (
              <div>
                <label className="block text-sm text-slate-300 mb-2">Folder</label>
                <select value={linkFolderId} onChange={(e) => setLinkFolderId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">No folder (root)</option>
                  {folders.map((f) => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={editingLink ? updateLink : addLink}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors">
                {editingLink ? 'Update Link' : 'Add Link'}
              </button>
              <button onClick={resetForm}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {allGridItems.map((item) => {
          const isDragging = dragging?.id === item.id;
          const isOver = dragOverId === item.id && dragging && dragging.id !== item.id;
          const isDropTarget = isOver && dragMode === 'into-folder' && item.itemType === 'folder';
          const isReorderTarget = isOver && !isDropTarget;

          const dragClasses = [
            isDragging ? 'opacity-50' : '',
            isDropTarget ? 'ring-2 ring-green-400/70 bg-slate-700/80' : '',
            isReorderTarget ? 'ring-2 ring-blue-500/60' : '',
          ].join(' ');

          if (item.itemType === 'folder') {
            const folder = item.data;
            const count = links.filter((l) => l.folder_id === folder.id).length;
            const folderLinks = links.filter((l) => l.folder_id === folder.id);
            const isExpanded = expandedFolderId === folder.id;
            return (
              <div
                key={`folder-${folder.id}`}
                className={`group relative rounded-xl p-6 border flex flex-col items-center ${isExpanded ? 'justify-start' : 'justify-center'} text-center transition-all bg-slate-900/50 hover:bg-slate-900/80 border-slate-700/50 ${dragClasses}`}
                onDragOver={onDragOver(folder.id, 'folder')}
                onDrop={onDropOn(folder.id, 'folder')}
              >
                <button
                  draggable
                  onDragStart={onDragStart(folder.id, 'folder')}
                  onDragEnd={onDragEnd}
                  className="absolute top-2 left-2 p-2 rounded-lg bg-slate-800/40 border border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                  title="Drag to reorder"
                >
                  <GripVertical className="w-4 h-4 text-slate-300" />
                </button>

                {/* Drop-into hint */}
                {isDropTarget && (
                  <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-green-500/10 pointer-events-none">
                    <span className="text-green-400 text-xs font-medium">Drop to add</span>
                  </div>
                )}

                <button
                  onClick={() => setExpandedFolderId(isExpanded ? null : folder.id)}
                  className="flex flex-col items-center w-full"
                >
                  <div className="mb-3 text-4xl">{folder.icon}</div>
                  <h3 className="text-white font-medium mb-1">{folder.name}</h3>
                  <p className="text-xs text-slate-500">{count} link{count !== 1 ? 's' : ''}</p>
                </button>

                {isExpanded && (
                  <div className="w-full mt-3 pt-3 border-t border-slate-700/50 ql-folder-open">
                    {folderLinks.length > 0 ? (
                      <div className="w-full space-y-1">
                        {folderLinks.sort((a, b) => a.order_index - b.order_index).map((link) => {
                          const isItemDragging = draggingFolderItem === link.id;
                          const isItemOver = dragOverFolderItemId === link.id && draggingFolderItem !== link.id;
                          return (
                            <div
                              key={link.id}
                              className={`flex items-center gap-2 px-2 py-1.5 bg-slate-800/60 rounded-lg transition-all ${isItemDragging ? 'opacity-40' : ''} ${isItemOver ? 'ring-1 ring-blue-500/60' : ''}`}
                              onDragOver={onFolderItemDragOver(link.id)}
                              onDrop={onFolderItemDrop(folder.id, link.id)}
                            >
                              <button
                                draggable
                                onDragStart={onFolderItemDragStart(link.id)}
                                onDragEnd={onFolderItemDragEnd}
                                className="cursor-grab active:cursor-grabbing shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <GripVertical className="w-3 h-3 text-slate-500" />
                              </button>
                              <LinkIcon link={link} size={18} />
                              <span className="text-white text-xs flex-1 truncate text-left">{link.title}</span>
                              <button onClick={(e) => { e.stopPropagation(); startEditLink(link); }} className="p-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors shrink-0">
                                <Pencil className="w-3 h-3 text-white" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setLinkToDelete(link); }} className="p-1 bg-red-600 hover:bg-red-700 rounded transition-colors shrink-0">
                                <Trash2 className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-xs text-center py-2">No links in this folder</p>
                    )}
                  </div>
                )}

                <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEditFolder(folder)} className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                    <Pencil className="w-4 h-4 text-white" />
                  </button>
                  <button onClick={() => setFolderToDelete(folder)} className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            );
          }

          const link = item.data;
          const inFolder = folders.find((f) => f.id === link.folder_id);
          return (
            <div
              key={`link-${link.id}`}
              className={`${tileBase} bg-slate-900/50 hover:bg-slate-900/80 border-slate-700/50 ${dragClasses}`}
              onDragOver={onDragOver(link.id, 'link')}
              onDrop={onDropOn(link.id, 'link')}
            >
              <button
                draggable
                onDragStart={onDragStart(link.id, 'link')}
                onDragEnd={onDragEnd}
                className="absolute top-2 left-2 p-2 rounded-lg bg-slate-800/40 border border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                title="Drag to reorder"
              >
                <GripVertical className="w-4 h-4 text-slate-300" />
              </button>

              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-end gap-1">
                {link.scope === 'personal' && <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded border border-blue-600/30">Personal</span>}
                {link.scope === 'shared' && <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded border border-green-600/30">Shared</span>}
                {link.scope === 'both' && <span className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded border border-purple-600/30">Both</span>}
                {inFolder && <span className="px-2 py-1 bg-slate-600/30 text-slate-400 text-xs rounded border border-slate-600/30">{inFolder.icon} {inFolder.name}</span>}
              </div>

              <div className="mb-3"><LinkIcon link={link} size={42} /></div>
              <h3 className="text-white font-medium mb-3">{link.title}</h3>

              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEditLink(link)} className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                  <Pencil className="w-4 h-4 text-white" />
                </button>
                <button onClick={() => setLinkToDelete(link)} className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {allGridItems.length === 0 && !showForm && !showFolderForm && (
        <p className="text-slate-400 text-center py-12">No quick links yet. Add one to get started!</p>
      )}

      {/* Delete link modal */}
      {linkToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-white mb-2">Delete Quick Link?</h3>
              <p className="text-slate-400">Are you sure you want to delete "{linkToDelete.title}"? This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setLinkToDelete(null)} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors">Cancel</button>
              <button onClick={deleteLink} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete folder modal */}
      {folderToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">{folderToDelete.icon}</div>
              <h3 className="text-xl font-semibold text-white mb-2">Delete Folder?</h3>
              <p className="text-slate-400">What should happen to the links inside "{folderToDelete.name}"?</p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => deleteFolder('root')} className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors">Move links to root</button>
              <button onClick={() => deleteFolder('delete')} className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors">Delete folder and all links</button>
              <button onClick={() => setFolderToDelete(null)} className="w-full px-4 py-2 bg-transparent hover:bg-slate-700 rounded-lg text-slate-400 font-medium transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
