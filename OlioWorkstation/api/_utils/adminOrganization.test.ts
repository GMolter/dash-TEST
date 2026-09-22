import { describe, expect, it } from 'vitest';
import { organizationWriteValues, validateOrganizationValues, validateOrganizationMemberAction } from './adminOrganization';
import { ADMIN_RESOURCES, editableColumns } from './adminResources';
const id = '00000000-0000-4000-8000-000000000001';
describe('organization admin validation', () => {
  it('preserves leading zeros and rejects invalid join codes', () => {
    expect(() => validateOrganizationValues('organizations', { code: '0012' })).not.toThrow();
    expect(organizationWriteValues('organizations', { code: '0012' }, false, id).code).toBe('0012');
    for (const code of [12, '12', '12345', '1e03', ' abcd', null]) expect(() => validateOrganizationValues('organizations', { code })).toThrow('INVALID_JOIN_CODE');
  });
  it('normalizes optional creation dates without overriding explicit dates or authors', () => {
    expect(organizationWriteValues('org-announcements', { created_at: '', updated_at: null }, true, id)).toEqual({ created_by: id });
    expect(organizationWriteValues('org-announcements', { created_at: '2020-01-01', created_by: null }, true, id)).toEqual({ created_at: '2020-01-01', created_by: null });
    expect(() => organizationWriteValues('org-activity', { created_at: '' }, false, id)).toThrow();
    expect(() => validateOrganizationValues('org-activity', { created_at: 'yesterday' })).toThrow();
  });
  it('allows only explicit member actions and roles', () => {
    expect(() => validateOrganizationMemberAction('set-member', { member_id: id, role: 'owner' })).not.toThrow();
    expect(() => validateOrganizationMemberAction('set-member', { member_id: id, role: 'app_owner' })).toThrow();
    expect(() => validateOrganizationMemberAction('remove-member', { member_id: id, app_admin: true })).toThrow();
    expect(() => validateOrganizationMemberAction('transfer-owner', { owner_id: 'invalid' })).toThrow();
  });
  it('rejects dangerous library links and clears link URLs when changing to notes', () => {
    for (const url of ['javascript:alert(1)', 'https://name:password@example.com']) expect(() => validateOrganizationValues('org-resources', { url })).toThrow();
    expect(organizationWriteValues('org-resources', { kind: 'note', url: 'https://example.com' }, false, id).url).toBeNull();
  });
  it('exposes content, authors and dates while preserving audit immutability', () => {
    for (const key of ['org-announcements', 'org-resources', 'org-activity']) {
      expect(editableColumns(ADMIN_RESOURCES[key], false)).toContain('created_at');
      expect(editableColumns(ADMIN_RESOURCES[key], false)).toContain('org_id');
    }
    expect(editableColumns(ADMIN_RESOURCES['org-announcements'], false)).toContain('created_by');
    expect(ADMIN_RESOURCES['audit-log'].readOnly).toBe(true);
  });
});
