import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Pencil, Folder, FolderOpen, ChevronLeft } from 'lucide-react';
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

interface Props {
  editMode?: boolean;
}

export function Quicklinks({ editMode = false }: Props) {
  const { user } = useAuth();
  const { organization } = useOrg();
  const [links, setLinks] = useState<Quicklink[]>([]);
  const [folders, setFolders] = useState<QuicklinkFolder[]>([]);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<Quicklink | null>(null);
  const [editingLink, setEditingLink] = useState<Quicklink | null>(null);

  // Folder form state
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [editingFolder, setEditingFolder] = useState<QuicklinkFolder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderIcon, setFolderIcon] = useState('📁');
  const [showFolderDeleteModal, setShowFolderDeleteModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<QuicklinkFolder | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [icon, setIcon] = useState('🔗');
  const [scope, setScope] = useState<'personal' | 'shared' | 'both'>('personal');
  const [linkFolderId, setLinkFolderId] = useState<string>('');

  const looksLikeUrl = (value: string) => {
    const v = (value || '').trim();
    return v.startsWith('http://') || v.startsWith('https://');
  };

  const formatUrl = (raw: string) => {
    const u = (raw || '').trim();
    if (!u) return u;
    if (!u.startsWith('http://') && !u.startsWith('https://')) return 'https://' + u;
    return u;
  };

  const faviconFor = (rawUrl: string) => {
    try {
      const u = new URL(formatUrl(rawUrl));
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(u.hostname)}&sz=64`;
    } catch {
      return '';
    }
  };

  const LinkIcon = ({ link, size = 40 }: { link: Quicklink; size?: number }) => {
    const customImg = looksLikeUrl(link.icon) ? link.icon.trim() : '';
    const fallbackEmoji =
      !looksLikeUrl(link.icon) && (link.icon || '').trim() ? (link.icon || '🔗') : '🔗';

    const favicon = faviconFor(link.url);
    const primarySrc = customImg || favicon;
    const [imgOk, setImgOk] = useState(!!primarySrc);

    if (primarySrc && imgOk) {
      return (
        <img
          src={primarySrc}
          alt=""
          width={size}
          height={size}
          className="rounded-md"
          onError={() => setImgOk(false)}
        />
      );
    }

    return (
      <span className="leading-none" style={{ fontSize: Math.round(size * 0.9) }}>
        {fallbackEmoji}
      </span>
    );
  };

  useEffect(() => {
    loadLinks();
    loadFolders();
  }, []);

  const loadLinks = async () => {
    const { data, error } = await supabase
      .from('quicklinks')
      .select('*')
      .order('order_index', { ascending: true });

    if (!error && data) {
      setLinks(data);
    }
  };

  const loadFolders = async () => {
    const { data, error } = await supabase
      .from('quicklink_folders')
      .select('*')
      .order('order_index', { ascending: true });

    if (!error && data) {
      setFolders(data);
    }
  };

  const resetForm = () => {
    setTitle('');
    setUrl('');
    setIcon('🔗');
    setScope('personal');
    setLinkFolderId('');
    setShowForm(false);
    setEditingLink(null);
  };

  const resetFolderForm = () => {
    setFolderName('');
    setFolderIcon('📁');
    setShowFolderForm(false);
    setEditingFolder(null);
  };

  const addLink = async () => {
    if (!title || !url || !organization || !user) return;

    const { error } = await supabase.from('quicklinks').insert({
      title,
      url,
      icon,
      order_index: links.length,
      org_id: organization.id,
      user_id: user.id,
      scope,
      folder_id: linkFolderId || null,
    });

    if (!error) {
      resetForm();
      loadLinks();
    }
  };

  const updateLink = async () => {
    if (!editingLink || !title || !url) return;

    const { error } = await supabase
      .from('quicklinks')
      .update({ title, url, icon, scope, folder_id: linkFolderId || null })
      .eq('id', editingLink.id);

    if (!error) {
      resetForm();
      loadLinks();
    }
  };

  const confirmDelete = (link: Quicklink) => {
    setLinkToDelete(link);
    setShowDeleteModal(true);
  };

  const deleteLink = async () => {
    if (!linkToDelete) return;

    const { error } = await supabase.from('quicklinks').delete().eq('id', linkToDelete.id);

    if (!error) {
      setShowDeleteModal(false);
      setLinkToDelete(null);
      loadLinks();
    }
  };

  const startEdit = (link: Quicklink) => {
    setEditingLink(link);
    setTitle(link.title);
    setUrl(link.url);
    setIcon(link.icon || '🔗');
    setScope(link.scope || 'personal');
    setLinkFolderId(link.folder_id || '');
    setShowForm(true);
  };

  const addFolder = async () => {
    if (!folderName || !organization || !user) return;

    const { error } = await supabase.from('quicklink_folders').insert({
      name: folderName,
      icon: folderIcon,
      order_index: folders.length,
      org_id: organization.id,
      user_id: user.id,
    });

    if (!error) {
      resetFolderForm();
      loadFolders();
    }
  };

  const updateFolder = async () => {
    if (!editingFolder || !folderName) return;

    const { error } = await supabase
      .from('quicklink_folders')
      .update({ name: folderName, icon: folderIcon })
      .eq('id', editingFolder.id);

    if (!error) {
      resetFolderForm();
      loadFolders();
    }
  };

  const startEditFolder = (folder: QuicklinkFolder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderIcon(folder.icon || '📁');
    setShowFolderForm(true);
  };

  const confirmDeleteFolder = (folder: QuicklinkFolder) => {
    setFolderToDelete(folder);
    setShowFolderDeleteModal(true);
  };

  const deleteFolder = async (strategy: 'root' | 'delete') => {
    if (!folderToDelete) return;

    if (strategy === 'root') {
      await supabase
        .from('quicklinks')
        .update({ folder_id: null })
        .eq('folder_id', folderToDelete.id);
    } else {
      await supabase.from('quicklinks').delete().eq('folder_id', folderToDelete.id);
    }

    await supabase.from('quicklink_folders').delete().eq('id', folderToDelete.id);

    if (openFolderId === folderToDelete.id) setOpenFolderId(null);
    setShowFolderDeleteModal(false);
    setFolderToDelete(null);
    loadLinks();
    loadFolders();
  };

  // --- Drag & drop ---

  const moveItem = (arr: Quicklink[], fromIdx: number, toIdx: number) => {
    const copy = [...arr];
    const [item] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, item);
    return copy;
  };

  const persistOrder = async (ordered: Quicklink[]) => {
    setSavingOrder(true);
    try {
      const updates = ordered.map((l, idx) => ({ id: l.id, order_index: idx }));
      const changed = updates.filter((u, idx) => ordered[idx]?.order_index !== u.order_index);
      const toWrite = changed.length > 0 ? changed : updates;

      await Promise.all(
        toWrite.map((u) =>
          supabase.from('quicklinks').update({ order_index: u.order_index }).eq('id', u.id)
        )
      );

      setLinks((prev) => ordered.map((l, idx) => ({ ...l, order_index: idx })));
    } finally {
      setSavingOrder(false);
    }
  };

  const onDragStart = (id: string) => (e: React.DragEvent) => {
    setDraggingId(id);
    setDragOverId(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    try {
      e.dataTransfer.setDragImage(e.currentTarget as HTMLElement, 0, 0);
    } catch {}
  };

  const onDragOver = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragOverId !== id) setDragOverId(id);
    e.dataTransfer.dropEffect = 'move';
  };

  const onDropOn = (targetId: string) => async (e: React.DragEvent) => {
    e.preventDefault();
    const id = draggingId || e.dataTransfer.getData('text/plain');
    if (!id || id === targetId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    const fromIdx = links.findIndex((l) => l.id === id);
    const toIdx = links.findIndex((l) => l.id === targetId);
    if (fromIdx < 0 || toIdx < 0) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    const ordered = moveItem(links, fromIdx, toIdx);
    setLinks(ordered);
    setDraggingId(null);
    setDragOverId(null);
    await persistOrder(ordered);
  };

  const onDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  // --- Filtered data ---

  // Always show personal links only
  const personalLinks = links.filter(
    (link) => link.scope === 'personal' || link.scope === 'both'
  );

  const rootLinks = personalLinks.filter((link) => !link.folder_id);
  const openFolderLinks = openFolderId
    ? personalLinks.filter((link) => link.folder_id === openFolderId)
    : [];
  const openFolder = folders.find((f) => f.id === openFolderId) ?? null;

  // --- View mode ---

  if (!editMode) {
    return (
      <div className="w-full">
        {openFolderId && openFolder && (
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={() => setOpenFolderId(null)}
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <span className="text-slate-300 font-medium flex items-center gap-2">
              <span>{openFolder.icon}</span>
              {openFolder.name}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {!openFolderId && folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setOpenFolderId(folder.id)}
              className="group bg-slate-800/50 hover:bg-slate-700/50 backdrop-blur rounded-xl p-6 border border-slate-700/50 hover:border-slate-600 transition-all flex flex-col items-center justify-center text-center"
            >
              <div className="mb-3 text-4xl">{folder.icon}</div>
              <h3 className="text-white font-medium group-hover:text-blue-400 transition-colors">
                {folder.name}
              </h3>
            </button>
          ))}

          {(openFolderId ? openFolderLinks : rootLinks).map((link) => (
            <a
              key={link.id}
              href={formatUrl(link.url)}
              className="group bg-slate-800/50 hover:bg-slate-700/50 backdrop-blur rounded-xl p-6 border border-slate-700/50 hover:border-slate-600 transition-all flex flex-col items-center justify-center text-center"
            >
              <div className="mb-3">
                <LinkIcon link={link} size={42} />
              </div>
              <h3 className="text-white font-medium group-hover:text-blue-400 transition-colors">
                {link.title}
              </h3>
            </a>
          ))}

          {!openFolderId && folders.length === 0 && rootLinks.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400">
              No quick links yet.
            </div>
          )}

          {openFolderId && openFolderLinks.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400">
              No links in this folder yet.
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Edit mode ---

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">Quick Links</h2>
          <p className="text-sm text-slate-400">
            Drag the grip to reorder · Click pencil to edit
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
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingFolder ? 'Edit Folder' : 'Add New Folder'}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Icon (emoji)</label>
              <input
                type="text"
                placeholder="📁"
                value={folderIcon}
                onChange={(e) => setFolderIcon(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Name</label>
              <input
                type="text"
                placeholder="Folder Name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={editingFolder ? updateFolder : addFolder}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
              >
                {editingFolder ? 'Update Folder' : 'Add Folder'}
              </button>
              <button
                onClick={resetFolderForm}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link form */}
      {showForm && (
        <div className="mb-6 p-6 bg-slate-900/50 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingLink ? 'Edit Link' : 'Add New Link'}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Icon (emoji or image URL)</label>
              <input
                type="text"
                placeholder="🔗  or  https://example.com/icon.png"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-2 text-xs text-slate-400">
                If you keep this as an emoji, Olio will try to show the site favicon automatically.
              </p>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">Title</label>
              <input
                type="text"
                placeholder="Link Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">URL</label>
              <input
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">Visibility</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as 'personal' | 'shared' | 'both')}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="personal">Personal - Only you can see this</option>
                <option value="shared">Shared - All organization members can see this</option>
                <option value="both">Both - Visible in personal and shared views</option>
              </select>
            </div>

            {folders.length > 0 && (
              <div>
                <label className="block text-sm text-slate-300 mb-2">Folder</label>
                <select
                  value={linkFolderId}
                  onChange={(e) => setLinkFolderId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No folder (root)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.icon} {f.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={editingLink ? updateLink : addLink}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
              >
                {editingLink ? 'Update Link' : 'Add Link'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folders grid */}
      {folders.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wide">Folders</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {folders.map((folder) => {
              const folderLinkCount = links.filter((l) => l.folder_id === folder.id).length;
              return (
                <div
                  key={folder.id}
                  className="group relative bg-slate-900/50 hover:bg-slate-900/80 rounded-xl p-6 border border-slate-700/50 flex flex-col items-center justify-center text-center transition-all"
                >
                  <div className="mb-3 text-4xl">{folder.icon}</div>
                  <h3 className="text-white font-medium mb-1">{folder.name}</h3>
                  <p className="text-xs text-slate-500">{folderLinkCount} link{folderLinkCount !== 1 ? 's' : ''}</p>
                  <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEditFolder(folder)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => confirmDeleteFolder(folder)}
                      className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Links grid */}
      {links.length > 0 && (
        <div>
          {folders.length > 0 && (
            <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wide">Links</h3>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {links.map((link) => {
              const isDragging = draggingId === link.id;
              const isOver = dragOverId === link.id && draggingId && draggingId !== link.id;
              const inFolder = folders.find((f) => f.id === link.folder_id);

              return (
                <div
                  key={link.id}
                  className={[
                    'group relative bg-slate-900/50 hover:bg-slate-900/80 rounded-xl p-6 border border-slate-700/50 flex flex-col items-center justify-center text-center transition-all',
                    isOver ? 'ring-2 ring-blue-500/60' : '',
                    isDragging ? 'opacity-60' : '',
                  ].join(' ')}
                  onDragOver={onDragOver(link.id)}
                  onDrop={onDropOn(link.id)}
                >
                  <button
                    draggable
                    onDragStart={onDragStart(link.id)}
                    onDragEnd={onDragEnd}
                    className="absolute top-2 left-2 p-2 rounded-lg bg-slate-800/40 border border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                    title="Drag to reorder"
                    aria-label="Drag to reorder"
                  >
                    <GripVertical className="w-4 h-4 text-slate-300" />
                  </button>

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-end gap-1">
                    {link.scope === 'personal' && (
                      <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded border border-blue-600/30">
                        Personal
                      </span>
                    )}
                    {link.scope === 'shared' && (
                      <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded border border-green-600/30">
                        Shared
                      </span>
                    )}
                    {link.scope === 'both' && (
                      <span className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded border border-purple-600/30">
                        Both
                      </span>
                    )}
                    {inFolder && (
                      <span className="px-2 py-1 bg-slate-600/30 text-slate-400 text-xs rounded border border-slate-600/30 flex items-center gap-1">
                        <FolderOpen className="w-3 h-3" />
                        {inFolder.name}
                      </span>
                    )}
                  </div>

                  <div className="mb-3">
                    <LinkIcon link={link} size={42} />
                  </div>

                  <h3 className="text-white font-medium mb-3">{link.title}</h3>

                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(link)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => confirmDelete(link)}
                      className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {links.length === 0 && folders.length === 0 && !showForm && !showFolderForm && (
        <p className="text-slate-400 text-center py-12">No quick links yet. Add one to get started!</p>
      )}

      {/* Delete link modal */}
      {showDeleteModal && linkToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-white mb-2">Delete Quick Link?</h3>
              <p className="text-slate-400">
                Are you sure you want to delete "{linkToDelete.title}"? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setLinkToDelete(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteLink}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete folder modal */}
      {showFolderDeleteModal && folderToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">📁</div>
              <h3 className="text-xl font-semibold text-white mb-2">Delete Folder?</h3>
              <p className="text-slate-400 mb-2">
                What should happen to links inside "{folderToDelete.name}"?
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => deleteFolder('root')}
                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
              >
                Move links to root
              </button>
              <button
                onClick={() => deleteFolder('delete')}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors"
              >
                Delete folder and all links
              </button>
              <button
                onClick={() => {
                  setShowFolderDeleteModal(false);
                  setFolderToDelete(null);
                }}
                className="w-full px-4 py-2 bg-transparent hover:bg-slate-700 rounded-lg text-slate-400 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
