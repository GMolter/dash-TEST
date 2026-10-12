import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { AdminPermissionPicker, changePermissionGroup } from './AdminPermissionPicker';
import { ADMIN_PERMISSION_CATALOG, validatePermissions } from '../../../api/_utils/adminPermissions';
const items = ADMIN_PERMISSION_CATALOG.filter(item => !item.ownerOnly);
it('adds dependencies for a field edit and removes dependent grants when an area is hidden', () => {
  const grants = changePermissionGroup(items, [], ['users.fields.display_name.update'], 'full');
  expect(() => validatePermissions(grants)).not.toThrow();
  expect(grants).toContain('users.fields.display_name.read');
  expect(grants).toContain('sections.people.update');
  const hidden = changePermissionGroup(items, grants, ['sections.people.read', 'sections.people.update'], 'hidden');
  expect(hidden).toEqual([]);
});
it('offers area controls and excludes protected fields from View', async () => {
  const onChange = vi.fn();
  render(<AdminPermissionPicker catalog={{ enabled: true, catalog: items, presets: {} }} value={{ preset: 'custom', permissions: [] }} onChange={onChange} />);
  await userEvent.click(within(screen.getByRole('group', { name: 'People access' })).getByRole('button', { name: 'View', exact: true }));
  const choice = onChange.mock.calls[0][0];
  expect(() => validatePermissions(choice.permissions)).not.toThrow();
  expect(choice.permissions).toContain('users.read');
  expect(choice.permissions).not.toContain('users.fields.temporary_password.read');
  expect(choice.permissions).not.toContain('users.update');
});
