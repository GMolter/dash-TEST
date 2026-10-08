import { randomUUID } from 'crypto';
import { exportQuicklinkBundle, parseQuicklinkBundle, QUICKLINK_LIMIT } from '../../shared/quicklinkBundle.js';

type Row = Record<string, any>;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function planQuicklinkOperation(service: any, values: Record<string, unknown>, actorIsOwner: boolean) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('INVALID_QUICKLINK_VALUES');
  const mode = String(values.mode);
  if (!['copy', 'move', 'edit', 'import'].includes(mode)) throw new Error('INVALID_QUICKLINK_MODE');
  const id = (v: unknown) => { if (typeof v !== 'string' || !uuid.test(v)) throw new Error('INVALID_ACCOUNT_OR_FOLDER'); return v; };
  const ids = (v: unknown): string[] => { if (!Array.isArray(v) || v.length > QUICKLINK_LIMIT) throw new Error('BULK_LIMIT'); return [...new Set(v.map(id))]; };
  const targetId = id(values.target_user_id);
  const sourceId = mode === 'import' ? targetId : id(values.source_user_id);
  if (mode === 'edit' && sourceId !== targetId) throw new Error('INVALID_EDIT_ACCOUNT');
  const folderIds = mode === 'import' ? [] : ids(values.folder_ids);
  const linkIds = mode === 'import' ? [] : ids(values.link_ids);
  const destinationId = values.destination_folder_id ? id(values.destination_folder_id) : null;
  if (destinationId && folderIds.length) throw new Error('INVALID_DESTINATION: Folders can only be placed at the account root.');
  async function read(table: string, build: (q: any) => any): Promise<Row[]> {
    const { data, error } = await build(service.from(table).select('*')).order('id').limit(QUICKLINK_LIMIT + 1);
    if (error) throw error;
    if (data.length > QUICKLINK_LIMIT) throw new Error('BULK_LIMIT: Select a smaller collection.');
    return data;
  }
  const { data: profiles, error } = await service.from('profiles').select('id,org_id,app_owner,display_name,email').in('id', [...new Set([sourceId, targetId])]).order('id');
  if (error) throw error;
  if (!profiles?.some((p: Row) => p.id === sourceId) || !profiles.some((p: Row) => p.id === targetId)) throw new Error('TARGET_NOT_FOUND');
  if (!actorIsOwner && profiles.some((p: Row) => p.app_owner)) throw new Error('OWNER_ACCOUNT_PROTECTED');
  const target = profiles.find((p: Row) => p.id === targetId);
  const folders = folderIds.length ? await read('quicklink_folders', q => q.in('id', folderIds)) : [];
  const selectedLinks = linkIds.length ? await read('quicklinks', q => q.in('id', linkIds)) : [];
  const children = folderIds.length ? await read('quicklinks', q => q.in('folder_id', folderIds)) : [];
  const links = [...new Map([...selectedLinks, ...children].map(r => [r.id, r])).values()].sort((a, b) => a.id.localeCompare(b.id));
  if (folders.length !== folderIds.length || selectedLinks.length !== linkIds.length) throw new Error('TARGET_NOT_FOUND');
  if ([...folders, ...links].some(r => r.user_id !== sourceId)) throw new Error('INVALID_SOURCE: All selected items and folder contents must belong to the source account.');
  let destination: Row[] = [];
  if (destinationId) {
    destination = await read('quicklink_folders', q => q.eq('id', destinationId));
    if (!destination[0] || destination[0].user_id !== targetId) throw new Error('INVALID_DESTINATION');
  }
  if (mode !== 'import' && !folders.length && !links.length) throw new Error('TARGET_REQUIRED');
  if (folders.length + links.length > QUICKLINK_LIMIT) throw new Error('BULK_LIMIT');
  const patch = (values.patch || {}) as Record<string, unknown>;
  if (typeof patch !== 'object' || Array.isArray(patch)) throw new Error('INVALID_FIELDS');
  if (mode === 'edit' && (!Object.keys(patch).length || Object.keys(patch).some(k => !['icon', 'scope'].includes(k)))) throw new Error('INVALID_FIELDS');
  if ('icon' in patch && (typeof patch.icon !== 'string' || patch.icon.length > 1000)) throw new Error('INVALID_ICON');
  if ('scope' in patch && !['personal', 'shared', 'both'].includes(String(patch.scope))) throw new Error('INVALID_SCOPE');
  const expected = { profiles: profiles.map((p: Row) => ({ id: p.id, org_id: p.org_id, app_owner: p.app_owner })), folders, links, destination };
  let writeFolders: Row[] = [], writeLinks: Row[] = [];
  if (mode === 'edit') {
    writeFolders = folders.map(r => ({ ...r, ...patch }));
    writeLinks = links.map(r => ({ ...r, ...patch }));
  } else {
    const ordered = (rows: Row[]) => [...rows].sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0) || a.id.localeCompare(b.id));
    const bundle = mode === 'import' ? parseQuicklinkBundle(values.bundle) : exportQuicklinkBundle(ordered(folders).map(r => ({ ...r, _admin_id: r.id })), ordered(links).map(r => ({ ...r, _admin_id: r.id })));
    if (destinationId && bundle.folders.length) throw new Error('INVALID_DESTINATION: Import folders at the account root.');
    const folderMap = new Map(bundle.folders.map(f => [f.key, mode === 'move' ? f.key : randomUUID()]));
    const ownership = { user_id: targetId, org_id: target.org_id };
    // Cross-account transfers and imports are private unless explicitly edited afterward.
    const scope = (s: string) => mode === 'import' || sourceId !== targetId ? 'personal' : s;
    writeFolders = bundle.folders.map(f => ({ id: folderMap.get(f.key), name: f.name, icon: f.icon, order_index: f.order_index, scope: scope(f.scope), ...ownership }));
    const orderedLinks = ordered(links);
    writeLinks = bundle.links.map((l, index) => ({ id: mode === 'move' ? orderedLinks[index].id : randomUUID(), title: l.title, url: l.url, icon: l.icon, order_index: l.order_index, scope: scope(l.scope), folder_id: l.folder ? folderMap.get(l.folder) : destinationId, ...ownership }));
  }
  if ([...writeFolders, ...writeLinks].some(r => r.scope !== 'personal' && !target.org_id)) throw new Error('INVALID_SCOPE: Shared items require an organization.');
  const label = (p: Row) => String(p.display_name || p.email || p.id);
  const summary = mode === 'edit' ? `Update ${Object.keys(patch).join(' and ')} for selected items in ${label(target)}.` : `${mode === 'import' ? 'Import file' : `${mode === 'move' ? 'Move' : 'Copy'} from ${label(profiles.find((p: Row) => p.id === sourceId))}`} to ${label(target)} / ${destination[0]?.name || 'account root'}.${mode === 'import' || sourceId !== targetId ? ' Destination visibility: personal.' : ''}`;
  return { expected, folders: writeFolders, links: writeLinks, mode, count: writeFolders.length + writeLinks.length, summary };
}
