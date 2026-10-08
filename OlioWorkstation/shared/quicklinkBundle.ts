export const QUICKLINK_LIMIT = 500;
export type BundleFolder = { key: string; name: string; icon: string; order_index: number; scope: string };
export type BundleLink = { title: string; url: string; icon: string; order_index: number; scope: string; folder: string | null };
export type QuicklinkBundle = { format: 'olio-quicklinks'; version: 1; folders: BundleFolder[]; links: BundleLink[] };

/** Portable content only: account IDs and database IDs must never be imported. */
export function parseQuicklinkBundle(input: unknown): QuicklinkBundle {
  const value = input as QuicklinkBundle;
  if (!value || value.format !== 'olio-quicklinks' || value.version !== 1 || !Array.isArray(value.folders) || !Array.isArray(value.links)) throw new Error('INVALID_BUNDLE: Choose an Olio quicklinks JSON export (version 1).');
  if (!value.folders.length && !value.links.length) throw new Error('INVALID_BUNDLE: No items to import.');
  if (value.folders.length + value.links.length > QUICKLINK_LIMIT) throw new Error(`BULK_LIMIT: Select at most ${QUICKLINK_LIMIT} items, including folder contents.`);
  const text = (s: unknown, max: number, required = false) => {
    if (typeof s !== 'string' || s.length > max || (required && !s.trim())) throw new Error('INVALID_BUNDLE: Invalid or missing text field.');
    return s;
  };
  const scope = (s: unknown) => {
    if (!['personal', 'shared', 'both'].includes(String(s))) throw new Error('INVALID_BUNDLE: Invalid scope.');
    return String(s);
  };
  const order = (n: unknown) => {
    if (!Number.isSafeInteger(n) || Number(n) < -2147483648 || Number(n) > 2147483647) throw new Error('INVALID_BUNDLE: Invalid order.');
    return Number(n);
  };
  const folders = value.folders.map(f => ({ key: text(f?.key, 100, true), name: text(f?.name, 1000, true), icon: text(f?.icon ?? '', 1000), order_index: order(f?.order_index), scope: scope(f?.scope) }));
  const keys = new Set(folders.map(f => f.key));
  if (keys.size !== folders.length) throw new Error('INVALID_BUNDLE: Duplicate folder keys.');
  const links = value.links.map(l => {
    const url = text(l?.url, 8000, true);
    try { if (!['http:', 'https:'].includes(new URL(url).protocol)) throw new Error(); } catch { throw new Error('INVALID_BUNDLE: Links must have an HTTP or HTTPS URL.'); }
    if (l.folder !== null && !keys.has(l.folder)) throw new Error('INVALID_BUNDLE: Link references a missing folder.');
    return { title: text(l.title, 1000, true), url, icon: text(l.icon ?? '', 1000), order_index: order(l.order_index), scope: scope(l.scope), folder: l.folder };
  });
  return { format: 'olio-quicklinks', version: 1, folders, links };
}

type Row = Record<string, unknown> & { _admin_id: string };
export function exportQuicklinkBundle(folders: Row[], links: Row[]): QuicklinkBundle {
  const keys = new Set(folders.map(f => f._admin_id));
  return { format: 'olio-quicklinks', version: 1,
    folders: folders.map(f => ({ key: f._admin_id, name: String(f.name || ''), icon: String(f.icon || ''), scope: String(f.scope || 'personal'), order_index: Number(f.order_index || 0) })),
    links: links.map(l => ({ title: String(l.title || ''), url: String(l.url || ''), icon: String(l.icon || ''), scope: String(l.scope || 'personal'), order_index: Number(l.order_index || 0), folder: keys.has(String(l.folder_id)) ? String(l.folder_id) : null })),
  };
}
