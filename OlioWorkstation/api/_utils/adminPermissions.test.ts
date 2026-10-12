import { resolveRecordHandle } from './adminRecordHandles';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_RESOURCES } from './adminResources';
import { authorizeOperation, hasPermission, permittedResource, presetPermissions, projectAdminRow, validatePermissions } from './adminPermissions';
beforeEach(() => vi.stubEnv('ADMIN_OPERATION_SECRET', 'test-handle-secret'));
afterEach(() => vi.unstubAllEnvs());
const custom = { appOwner: false, permissions: ['sections.people.read', 'sections.people.update', 'users.read', 'users.control', 'users.update', 'users.fields.display_name.read', 'users.fields.display_name.update', 'users.fields.email.read'] };
describe('admin permission enforcement', () => {
  it('allows editing a name without granting email or membership writes', () => {
    expect(() => validatePermissions(custom.permissions)).not.toThrow();
    expect(() => authorizeOperation(custom, ADMIN_RESOURCES.users, { kind: 'update', values: { display_name: 'New name' } })).not.toThrow();
    for (const values of [{ email: 'new@example.com' }, { org_id: 'other' }, { app_admin: true }]) expect(() => authorizeOperation(custom, ADMIN_RESOURCES.users, { kind: 'update', values })).toThrow('PERMISSION_DENIED');
    for (const kind of ['reset-password', 'ban', 'request-admin', 'revoke-admin', 'set-access']) expect(() => authorizeOperation(custom, ADMIN_RESOURCES.users, { kind })).toThrow('PERMISSION_DENIED');
  });
  it('projects hidden fields out and removes hidden search/filter/sort paths', () => {
    const row = projectAdminRow(custom, ADMIN_RESOURCES.users, { _admin_id: 'u', email: 'view@example.com', display_name: 'A', org_id: 'secret' });
    expect(row).toEqual({ _admin_id: expect.stringMatching(/^opaque\./), email: 'view@example.com', display_name: 'A' });
    expect(resolveRecordHandle(row._admin_id)).toBe('u');
    expect(() => resolveRecordHandle(row._admin_id.slice(0, -4))).toThrow('INVALID_RECORD_HANDLE');
    const resource = permittedResource(custom, ADMIN_RESOURCES.users);
    expect(resource.filterFields).not.toContain('org_id'); expect(resource.sortFields).not.toContain('created_at');
    expect(resource.fields.find(field => field.name === 'email')?.editable).toBe(false);
  });
  it('caps child writes at the parent and denies unknown/new catalog items', () => {
    expect(hasPermission({ ...custom, permissions: custom.permissions.filter(key => key !== 'sections.people.update') }, 'users.fields.display_name.update')).toBe(false);
    expect(hasPermission({ appOwner: true, permissions: [] }, 'users.future')).toBe(false);
  });
  it('read-only denies all mutations and protected reveals', () => {
    const access = { appOwner: false, permissions: presetPermissions('read-only') };
    expect(() => validatePermissions(access.permissions)).not.toThrow();
    expect(hasPermission(access, 'users.read')).toBe(true);
    for (const key of ['features.update', 'features.create', 'users.reset-password', 'quick-pastes.reveal', 'quick-pastes.fields.content.read', 'users.set-access']) expect(hasPermission(access, key)).toBe(false);
  });
  it('full keeps owner-only management excluded', () => {
    const access = { appOwner: false, permissions: presetPermissions('full') };
    expect(() => validatePermissions(access.permissions)).not.toThrow();
    expect(hasPermission(access, 'features.update')).toBe(true); expect(hasPermission(access, 'users.set-access')).toBe(false);
  });
  it('bulk requires all source reads and destination writes before planning', () => {
    const full = presetPermissions('full');
    expect(() => authorizeOperation({ appOwner: false, permissions: full.filter(key => key !== 'quicklink-folders.create') }, ADMIN_RESOURCES.quicklinks, { kind: 'bulk-quicklinks' })).toThrow('PERMISSION_DENIED');
  });
});
