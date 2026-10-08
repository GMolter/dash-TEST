import { describe, expect, it } from 'vitest';
import { planQuicklinkOperation } from './adminQuicklinks';
import { exportQuicklinkBundle, parseQuicklinkBundle } from '../../shared/quicklinkBundle';

const source = '11111111-1111-4111-8111-111111111111';
const target = '22222222-2222-4222-8222-222222222222';
const folder = '33333333-3333-4333-8333-333333333333';
const link = '44444444-4444-4444-8444-444444444444';
const other = '55555555-5555-4555-8555-555555555555';
const folderRow = { id: folder, user_id: source, org_id: 'old-org', name: 'School', icon: '📁', scope: 'shared', order_index: 1 };
const linkRow = { id: link, user_id: source, org_id: 'old-org', folder_id: folder, title: 'Course', url: 'https://example.com', icon: '', scope: 'shared', order_index: 2 };
function database(overrides: Record<string, Record<string, unknown>[]> = {}) {
  const tables = { profiles: [{ id: source, org_id: 'old-org', app_owner: false }, { id: target, org_id: 'new-org', app_owner: false }], quicklink_folders: [folderRow], quicklinks: [linkRow], ...overrides };
  return { from(table: string) {
    let rows: Record<string, unknown>[] = tables[table as keyof typeof tables];
    const q = { select: () => q, order: () => q, limit: (n: number) => { rows = rows.slice(0, n); return q; },
      in: (key: string, values: unknown[]) => { rows = rows.filter(r => values.includes(r[key])); return q; },
      eq: (key: string, value: unknown) => { rows = rows.filter(r => r[key] === value); return q; },
      then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve) };
    return q;
  } };
}
const input = { mode: 'copy', source_user_id: source, target_user_id: target, folder_ids: [folder], link_ids: [link] };
describe('bulk quicklink planning', () => {
  it('copies folders with deduplicated children, new IDs and private destination ownership', async () => {
    const plan = await planQuicklinkOperation(database(), input, false);
    expect(plan.count).toBe(2);
    expect(plan.folders[0].id).not.toBe(folder);
    expect(plan.links[0]).toMatchObject({ folder_id: plan.folders[0].id, user_id: target, org_id: 'new-org', scope: 'personal' });
    expect(plan.links[0].id).not.toBe(link);
    expect(plan.expected.links).toEqual([linkRow]);
  });
  it('moves all folder children while preserving their IDs', async () => {
    const plan = await planQuicklinkOperation(database(), { ...input, mode: 'move', link_ids: [] }, false);
    expect(plan.folders[0].id).toBe(folder);
    expect(plan.links[0]).toMatchObject({ id: link, folder_id: folder, user_id: target });
  });
  it('moves standalone links into the destination folder', async () => {
    const plan = await planQuicklinkOperation(database({ quicklink_folders: [folderRow, { ...folderRow, id: other, user_id: target }] }), { ...input, mode: 'move', folder_ids: [], destination_folder_id: other }, false);
    expect(plan.links[0].folder_id).toBe(other);
    expect(plan.folders).toEqual([]);
  });
  it('rejects missing selections, foreign children and protected account destinations', async () => {
    await expect(planQuicklinkOperation(database(), { ...input, link_ids: [other] }, false)).rejects.toThrow('TARGET_NOT_FOUND');
    await expect(planQuicklinkOperation(database({ quicklinks: [{ ...linkRow, user_id: target }] }), input, false)).rejects.toThrow('INVALID_SOURCE');
    await expect(planQuicklinkOperation(database({ profiles: [{ id: source }, { id: target, app_owner: true }] }), input, false)).rejects.toThrow('OWNER_ACCOUNT_PROTECTED');
  });
  it('rejects foreign destination folders and nesting folders', async () => {
    await expect(planQuicklinkOperation(database(), { ...input, folder_ids: [], destination_folder_id: folder }, false)).rejects.toThrow('INVALID_DESTINATION');
    await expect(planQuicklinkOperation(database(), { ...input, destination_folder_id: folder }, false)).rejects.toThrow('INVALID_DESTINATION');
  });
  it('edits shared fields on folders and children without changing ownership or names', async () => {
    const plan = await planQuicklinkOperation(database(), { ...input, mode: 'edit', target_user_id: source, patch: { icon: '★', scope: 'personal' } }, false);
    expect(plan.folders[0]).toMatchObject({ name: 'School', user_id: source, icon: '★' });
    expect(plan.links[0]).toMatchObject({ title: 'Course', folder_id: folder, icon: '★', scope: 'personal' });
    await expect(planQuicklinkOperation(database(), { ...input, mode: 'edit', target_user_id: source, patch: { user_id: target } }, false)).rejects.toThrow('INVALID_FIELDS');
  });
  it('imports portable folders with fresh relationships and ignores embedded ownership', async () => {
    const bundle = exportQuicklinkBundle([{ ...folderRow, _admin_id: folder }], [{ ...linkRow, _admin_id: link }]);
    const plan = await planQuicklinkOperation(database(), { mode: 'import', target_user_id: target, bundle }, false);
    expect(plan.links[0].folder_id).toBe(plan.folders[0].id);
    expect(plan.links[0].user_id).toBe(target);
    expect(JSON.stringify(bundle)).not.toContain('user_id');
    expect(parseQuicklinkBundle(bundle)).toEqual(bundle);
  });
  it('rejects malformed imports, unsafe URLs, dangling references and over-limit collections', () => {
    const bundle = exportQuicklinkBundle([{ ...folderRow, _admin_id: folder }], [{ ...linkRow, _admin_id: link }]);
    expect(() => parseQuicklinkBundle({ ...bundle, version: 2 })).toThrow('INVALID_BUNDLE');
    expect(() => parseQuicklinkBundle({ ...bundle, folders: [...bundle.folders, ...bundle.folders] })).toThrow('Duplicate');
    expect(() => parseQuicklinkBundle({ ...bundle, folders: [] })).toThrow('missing folder');
    expect(() => parseQuicklinkBundle({ ...bundle, links: [{ ...bundle.links[0], url: 'javascript:alert(1)' }] })).toThrow('HTTP');
    expect(() => parseQuicklinkBundle({ ...bundle, links: Array(501).fill(bundle.links[0]) })).toThrow('BULK_LIMIT');
  });
});
