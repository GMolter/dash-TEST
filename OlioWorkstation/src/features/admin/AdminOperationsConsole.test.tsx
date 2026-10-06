import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { AdminOperationsConsole } from './AdminOperationsConsole';
import { loadAdminOverview, loadAdminResource } from './api';
import type { AdminListResponse } from './types';

vi.mock('./api', () => ({ loadAdminOverview: vi.fn(), loadAdminResource: vi.fn(), loadAdminUserAccount: vi.fn(), revealAdminField: vi.fn() }));
vi.mock('./AdminOperationDialog', () => ({ AdminOperationDialog: ({ operation }: { operation: unknown }) => operation ? <output data-testid="operation">{JSON.stringify(operation)}</output> : null }));
const resources = [
  { key: 'projects', label: 'Projects', group: 'projects', actions: ['update'] },
  { key: 'pastes', label: 'Pastes', group: 'content', actions: ['update'] },
  { key: 'quicklinks', label: 'Quick links', group: 'utilities', actions: ['update'] },
  { key: 'help-articles', label: 'Help articles', group: 'platform', actions: ['update'] },
  { key: 'audit-log', label: 'Activity log', group: 'audit', actions: [] },
];
function list(resource: string): AdminListResponse {
  return { resource, label: resources.find(item => item.key === resource)!.label, rows: [{ _admin_id: `${resource}-1`, title: `${resource} example`, content: 'Never show in a card' }], total: 1,
    fields: [{ name: 'title', label: 'Title', type: 'text', editable: true, create: true }, { name: 'content', label: 'Content', type: 'textarea', sensitive: true, editable: true }], actions: ['create', 'update', 'delete'], redactedFields: ['content'], filterFields: [], sortFields: ['title'], page: 1, pageSize: 25, sort: 'title', direction: 'desc' };
}
beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, '', '/admin');
  vi.mocked(loadAdminOverview).mockResolvedValue({ isOwner: true, metrics: {}, recentAudit: [], resources });
  vi.mocked(loadAdminResource).mockImplementation(async input => list(input.resource));
});

it('moves Activity into Workspace tools and replaces the three navigation entries with Workspace data', async () => {
  render(<AdminOperationsConsole />);
  const navigation = await screen.findByRole('navigation', { name: 'Admin navigation' });
  expect(within(navigation).queryByRole('button', { name: 'Activity', exact: true })).not.toBeInTheDocument();
  await userEvent.click(within(navigation).getByRole('button', { name: 'Workspace tools' }));
  expect(within(navigation).getByRole('button', { name: 'Activity', exact: true })).toBeVisible();
  expect(within(navigation).getByRole('button', { name: 'Help Center' })).toBeVisible();
  expect(within(navigation).queryByRole('button', { name: /^(Projects|Content|Utilities|Platform)$/ })).not.toBeInTheDocument();
  await userEvent.click(within(navigation).getByRole('button', { name: 'Workspace data' }));
  expect(await screen.findByRole('navigation', { name: 'Workspace collections' })).toBeVisible();
  expect(await screen.findByRole('button', { name: /projects example View details/ })).toBeVisible();
});

it.each([['projects', 'projects'], ['content', 'pastes'], ['utilities', 'quicklinks']])('keeps the legacy %s link working in the combined workspace', async (section, resource) => {
  window.history.replaceState({}, '', `/admin?section=${section}`);
  render(<AdminOperationsConsole />);
  expect(await screen.findByRole('button', { name: new RegExp(`${resource} example View details`) })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Workspace data' })).toBeVisible();
  expect(window.location.search).toContain('section=workspace');
});

it('views and edits a record on the same page, preserving protected fields and audited save targets', async () => {
  window.history.replaceState({}, '', '/admin?section=workspace&resource=pastes');
  render(<AdminOperationsConsole />);
  await userEvent.click(await screen.findByRole('button', { name: /pastes example View details/ }));
  const details = screen.getByRole('region', { name: 'View Pastes' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.queryByText('Never show in a card')).not.toBeInTheDocument();
  expect(within(details).getByText('Protected information')).toBeVisible();
  await userEvent.click(within(details).getByRole('button', { name: 'Edit', exact: true }));
  fireEvent.change(within(details).getByLabelText('Title'), { target: { value: 'Cancelled edit' } });
  await userEvent.click(within(details).getByRole('button', { name: 'Cancel', exact: true }));
  await userEvent.click(within(details).getByRole('button', { name: 'Edit', exact: true }));
  expect(within(details).getByLabelText('Title')).toHaveValue('pastes example');
  fireEvent.change(within(details).getByLabelText('Title'), { target: { value: 'Revised title' } });
  await userEvent.click(within(details).getByRole('button', { name: 'Review changes' }));
  expect(JSON.parse(screen.getByTestId('operation').textContent!)).toEqual({ resource: 'pastes', kind: 'update', ids: ['pastes-1'], values: { title: 'Revised title' } });
});

it('clears record selection and search when switching collections and ignores a stale response', async () => {
  window.history.replaceState({}, '', '/admin?section=workspace');
  let finish: (result: AdminListResponse) => void = () => {};
  vi.mocked(loadAdminResource).mockImplementation(input => input.resource === 'projects' ? new Promise(resolve => { finish = resolve; }) : Promise.resolve(list(input.resource)));
  render(<AdminOperationsConsole />);
  const collections = await screen.findByRole('navigation', { name: 'Workspace collections' });
  await waitFor(() => expect(loadAdminResource).toHaveBeenCalled());
  await userEvent.click(within(collections).getByRole('button', { name: 'Quick links' }));
  expect(await screen.findByRole('button', { name: /quicklinks example View details/ })).toBeVisible();
  await act(async () => finish(list('projects')));
  expect(screen.queryByRole('button', { name: /projects example View details/ })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /quicklinks example View details/ }));
  fireEvent.change(screen.getByLabelText('Search records'), { target: { value: 'previous search' } });
  await userEvent.click(within(collections).getByRole('button', { name: 'Pastes', exact: true }));
  expect(await screen.findByRole('button', { name: /pastes example View details/ })).toBeVisible();
  expect(screen.getByLabelText('Search records')).toHaveValue('');
  expect(screen.queryByRole('region', { name: 'View Quick links' })).not.toBeInTheDocument();
});
