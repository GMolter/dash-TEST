import { privateRecordHandle } from './adminRecordHandles.js';
import { ADMIN_RESOURCES, resourceActionsForCatalog, type AdminResource } from './adminResources.js';

export const ADMIN_CATALOG_VERSION = 1;
export type AdminPermission = { key: string; label: string; parent?: string; write: boolean; protected?: boolean; ownerOnly?: boolean; requires?: string[] };
export type PermissionAccess = { appOwner: boolean; permissions: string[] };
export function resourceSection(resource: AdminResource): string {
  if (resource.key === 'features') return 'features';
  if (['dashboard-alerts', 'app-settings'].includes(resource.key)) return 'banner';
  if (['projects', 'content', 'utilities'].includes(resource.group)) return 'workspace';
  return resource.group;
}
const ownerActions = new Set(['request-admin', 'revoke-admin', 'set-access', 'approve-admin', 'reject-admin']);
export const ADMIN_PERMISSION_CATALOG: AdminPermission[] = [];
for (const section of new Set(Object.values(ADMIN_RESOURCES).map(resourceSection))) {
  ADMIN_PERMISSION_CATALOG.push({ key: `sections.${section}.read`, label: `${section}: view`, write: false, ownerOnly: section === 'reviews' });
  ADMIN_PERMISSION_CATALOG.push({ key: `sections.${section}.update`, label: `${section}: full control`, parent: `sections.${section}.read`, write: true, ownerOnly: section === 'reviews' });
}
for (const resource of Object.values(ADMIN_RESOURCES)) {
  const section = resourceSection(resource);
  const ownerOnly = resource.group === 'reviews';
  ADMIN_PERMISSION_CATALOG.push({ key: `${resource.key}.read`, label: resource.label, parent: `sections.${section}.read`, write: false, ownerOnly });
  ADMIN_PERMISSION_CATALOG.push({ key: `${resource.key}.control`, label: `${resource.label}: full control`, parent: `sections.${section}.update`, write: true, ownerOnly });
  for (const action of resourceActionsForCatalog(resource)) {
    ADMIN_PERMISSION_CATALOG.push({ key: `${resource.key}.${action}`, label: action, parent: action === 'reveal' ? `${resource.key}.read` : `${resource.key}.control`, requires: action === 'create' ? resource.fields.filter(field => field.required && field.create).map(field => `${resource.key}.fields.${field.name}.update`) : undefined, write: action !== 'reveal', protected: action === 'reveal', ownerOnly: ownerOnly || ownerActions.has(action) });
  }
  for (const field of resource.fields) {
    const key = `${resource.key}.fields.${field.name}`;
    const fieldOwnerOnly = ownerOnly || (resource.key === 'audit-log' && ['before_data', 'after_data', 'reason', 'actor_email', 'target_ids', 'changed_fields', 'error_code'].includes(field.name));
    ADMIN_PERMISSION_CATALOG.push({ key: `${key}.read`, label: field.label, parent: `${resource.key}.read`, write: false, protected: field.sensitive, ownerOnly: fieldOwnerOnly });
    if (field.editable || field.create) ADMIN_PERMISSION_CATALOG.push({ key: `${key}.update`, label: `${field.label}: edit`, parent: `${resource.key}.control`, write: true, ownerOnly: fieldOwnerOnly });
  }
}
ADMIN_PERMISSION_CATALOG.push(
  { key: 'users.background-view', label: 'Dashboard appearance: view', parent: 'users.read', write: false },
  { key: 'users.background-write', label: 'Dashboard appearance: change or remove', parent: 'users.control', write: true }
);
const catalog = new Map(ADMIN_PERMISSION_CATALOG.map(item => [item.key, item]));
export function hasPermission(access: PermissionAccess, key: string): boolean {
  const item = catalog.get(key);
  if (!item) return false;
  if (access.appOwner) return true;
  if (item.ownerOnly || !access.permissions?.includes(key)) return false;
  if (item.parent && !hasPermission(access, item.parent)) return false;
  if (key === 'users.background-write' && !hasPermission(access, 'users.background-view')) return false;
  const resource = key.split('.')[0];
  if (!key.startsWith('sections.') && key !== `${resource}.read` && !hasPermission(access, `${resource}.read`)) return false;
  if (key.includes('.fields.') && key.endsWith('.update') && !hasPermission(access, key.replace(/\.update$/, '.read'))) return false;
  return true;
}
export function presetPermissions(preset: string): string[] {
  if (preset === 'standard' || preset === 'custom') return [];
  if (!['read-only', 'full'].includes(preset)) throw new Error('INVALID_PRESET');
  return ADMIN_PERMISSION_CATALOG.filter(item => !item.ownerOnly && (preset === 'full' || (!item.write && !item.protected))).map(item => item.key);
}
export function validatePermissions(grants: unknown): string[] {
  if (!Array.isArray(grants) || grants.some(key => typeof key !== 'string' || !catalog.has(key) || catalog.get(key)?.ownerOnly)) throw new Error('INVALID_PERMISSIONS');
  const keys = [...new Set(grants as string[])].sort();
  const access = { appOwner: false, permissions: keys };
  if (keys.some(key => !hasPermission(access, key))) throw new Error('INVALID_PERMISSION_DEPENDENCIES');
  return keys;
}
export function requirePermission(access: PermissionAccess, key: string) {
  if (!hasPermission(access, key)) throw new Error('PERMISSION_DENIED');
}
export function permittedResource(access: PermissionAccess, resource: AdminResource): AdminResource {
  requirePermission(access, `${resource.key}.read`);
  const visible = (name: string) => hasPermission(access, `${resource.key}.fields.${name}.read`);
  return { ...resource, fields: resource.fields.filter(field => visible(field.name)).map(field => ({ ...field, editable: !!field.editable && hasPermission(access, `${resource.key}.fields.${field.name}.update`), create: !!field.create && hasPermission(access, `${resource.key}.fields.${field.name}.update`) })), searchFields: resource.searchFields.filter(name => visible(name) && !resource.fields.find(field => field.name === name)?.sensitive), filterFields: resource.filterFields?.filter(visible), sortFields: resource.sortFields.filter(visible) };
}
export function permittedActions(access: PermissionAccess, resource: AdminResource) {
  return resourceActionsForCatalog(resource).filter(action => hasPermission(access, `${resource.key}.${action}`) && (action !== 'create' || resource.fields.filter(field => field.create && field.required).every(field => hasPermission(access, `${resource.key}.fields.${field.name}.update`))));
}
export function projectAdminRow(access: PermissionAccess, resource: AdminResource, row: Record<string, any>, reveal = false): Record<string, any> {
  if (row._admin_protected) return { _admin_id: privateRecordHandle(String(row._admin_id)), _admin_protected: true };
  if (access.appOwner) return row;
  const result: Record<string, any> = {};
  if (row._admin_id !== undefined) result._admin_id = resource.primaryKey.split(',').every(field => hasPermission(access, resource.key + '.fields.' + field + '.read')) ? row._admin_id : privateRecordHandle(String(row._admin_id));
  for (const field of resource.fields) {
    if (hasPermission(access, `${resource.key}.fields.${field.name}.read`) && (!field.sensitive || (reveal && hasPermission(access, `${resource.key}.reveal`))) && field.name in row) result[field.name] = row[field.name];
  }
  if (row._admin_refs) {
    const refs = Object.fromEntries(Object.entries(row._admin_refs).filter(([field, ref]: [string, any]) => hasPermission(access, resource.key + '.fields.' + field + '.read') && hasPermission(access, ref.resource + '.read') && ADMIN_RESOURCES[ref.resource]?.fields.filter(item => ['id', 'display_name', 'email', 'name'].includes(item.name)).every(item => hasPermission(access, ref.resource + '.fields.' + item.name + '.read'))));
    if (Object.keys(refs).length) result._admin_refs = refs;
  }
  // Unstructured history can contain arbitrary values from other resources.
  if (!access.appOwner && resource.key === 'audit-log') {
    for (const key of ['before_data', 'after_data', 'metadata', 'reason', 'subject', 'description', 'actor_email', 'actor_name', 'target_ids', 'changed_fields', 'error_code']) delete result[key];
  }
  return result;
}
export function authorizeOperation(access: PermissionAccess, resource: AdminResource, operation: { kind: string; values?: Record<string, unknown>; revealFields?: string[] }) {
  requirePermission(access, `${resource.key}.${operation.kind}`);
  if (['create', 'update'].includes(operation.kind)) {
    for (const field of Object.keys(operation.values || {})) requirePermission(access, `${resource.key}.fields.${field}.update`);
    if (resource.key === 'users' && ['org_id', 'role'].some(key => key in (operation.values || {}))) requirePermission(access, 'users.remove-organization');
    if (resource.key === 'organizations' && 'code' in (operation.values || {})) requirePermission(access, 'organizations.regenerate-code');
    if (resource.key === 'organizations' && 'owner_id' in (operation.values || {})) requirePermission(access, 'organizations.transfer-owner');
  }
  for (const field of operation.revealFields || []) requirePermission(access, `${resource.key}.fields.${field}.read`);
  if (operation.kind === 'bulk-quicklinks') {
    for (const key of ['users', 'quicklinks', 'quicklink-folders']) {
      const target = ADMIN_RESOURCES[key];
      requirePermission(access, `${key}.read`);
      for (const field of target.fields) requirePermission(access, `${key}.fields.${field.name}.read`);
      if (key !== 'users') for (const action of ['create', 'update', 'delete']) requirePermission(access, `${key}.${action}`);
      if (key !== 'users') for (const field of target.fields.filter(field => field.create || field.editable)) requirePermission(access, `${key}.fields.${field.name}.update`);
    }
  }
}
