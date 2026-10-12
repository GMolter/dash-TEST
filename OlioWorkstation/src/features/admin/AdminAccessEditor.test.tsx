import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminAccessEditor } from './AdminAccessEditor';
import { adminFetch } from './api';
vi.mock('./api', () => ({ adminFetch: vi.fn() }));
vi.mock('./AdminOperationDialog', () => ({ AdminOperationDialog: ({ operation }: any) => operation ? <pre data-testid="operation">{JSON.stringify(operation)}</pre> : null }));
const items = [{ key: 'sections.people.read', label: 'People', write: false }, { key: 'sections.people.update', label: 'People control', parent: 'sections.people.read', write: true }, { key: 'users.read', label: 'Users', parent: 'sections.people.read', write: false }, { key: 'users.control', label: 'Users control', parent: 'sections.people.update', write: true }, { key: 'users.fields.display_name.read', label: 'Display name', parent: 'users.read', write: false }, { key: 'users.fields.display_name.update', label: 'Edit name', parent: 'users.control', write: true }];
beforeEach(() => { vi.mocked(adminFetch).mockImplementation(async path => path.includes('permission-catalog') ? { enabled: true, version: 1, catalog: items, presets: { 'read-only': items.filter(item => !item.write).map(item => item.key), full: items.map(item => item.key), custom: [], standard: [] } } : { preset: 'standard', revision: 0, permissions: [] }); });
describe('owner access editor', () => {
 it('defaults a promotion to an explicit read-only snapshot', async () => {
  render(<AdminAccessEditor userId="target" />);
  const button = await screen.findByRole('button', { name: 'Review access change' });
  act(() => button.click());
  const operation = JSON.parse(screen.getByTestId('operation').textContent!);
  expect(operation).toMatchObject({ kind: 'request-admin', ids: ['target'], values: { preset: 'read-only', revision: 0 } });
  expect(operation.values.permissions).toContain('users.read'); expect(operation.values.permissions).not.toContain('users.control');
 });
 it('keeps assignments disabled during a mixed-version rollout', async () => {
  vi.mocked(adminFetch).mockResolvedValueOnce({ enabled: false, catalog: items, presets: { 'read-only': [] } }).mockResolvedValueOnce({ preset: 'standard', revision: 0, permissions: [] });
  render(<AdminAccessEditor userId="target" />);
  await waitFor(() => expect(screen.getByText(/disabled until rollout/)).toBeInTheDocument());
  expect(screen.queryByRole('button', { name: 'Review access change' })).not.toBeInTheDocument();
 });
});
