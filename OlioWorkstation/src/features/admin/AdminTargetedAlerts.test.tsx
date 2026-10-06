import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { AdminTargetedAlerts } from './AdminTargetedAlerts';
import { loadAdminResource } from './api';
import type { AdminListResponse } from './types';

vi.mock('./api', () => ({ loadAdminResource: vi.fn() }));
vi.mock('./AdminOperationDialog', () => ({ AdminOperationDialog: ({ operation }: { operation: unknown }) => operation ? <output data-testid="operation">{JSON.stringify(operation)}</output> : null }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadAdminResource).mockImplementation(async ({ resource }) => ({ rows: resource === 'users' ? [{ _admin_id: 'user-1', display_name: 'Alex', email: 'alex@example.com' }] : resource === 'organizations' ? [{ _admin_id: 'org-1', name: 'Support' }] : [], total: 0 }) as AdminListResponse);
});

it('sends directly to the profile recipient without searching or exposing other audiences', async () => {
  const actor = userEvent.setup();
  render(<AdminTargetedAlerts recipient={{ id: 'profile-user', label: 'Avery (avery@example.com)' }} />);
  expect(screen.getByText('Avery (avery@example.com)')).toBeInTheDocument();
  expect(screen.queryByLabelText('Find recipients')).toBeNull();
  expect(loadAdminResource).not.toHaveBeenCalled();
  await actor.type(screen.getByLabelText('Alert message'), 'Please review your account settings.');
  await actor.click(screen.getByRole('button', { name: 'Send targeted alert' }));
  expect(JSON.parse(screen.getByTestId('operation').textContent!)).toMatchObject({ resource: 'dashboard-alerts', kind: 'create', values: { user_ids: ['profile-user'], org_ids: [], title: 'Announcement', message: 'Please review your account settings.' } });
});
it('requires a message and recipients, preserves selected users when adding organizations, and submits an audited alert', async () => {
  const actor = userEvent.setup();
  render(<AdminTargetedAlerts />);
  await actor.click(screen.getByRole("button", { name: "New targeted banner" }));
  const send = screen.getByRole('button', { name: 'Send targeted alert' });
  expect(send).toBeDisabled();
  await actor.clear(screen.getByLabelText('Banner title'));
  await actor.type(screen.getByLabelText('Banner title'), 'Service update');
  await actor.click(screen.getByRole('button', { name: 'Blue', exact: true }));
  await actor.type(screen.getByLabelText('Alert message'), 'Please update your workstation.');
  await actor.click(await screen.findByLabelText('Alex (alex@example.com)'));
  await actor.selectOptions(screen.getByLabelText('Recipient type'), 'organizations');
  await actor.click(await screen.findByLabelText('Support'));
  fireEvent.change(screen.getByLabelText('Alert start (optional)'), { target: { value: '2026-10-01T12:00' } });
  fireEvent.change(screen.getByLabelText('Alert end (optional)'), { target: { value: '2026-10-01T11:00' } });
  expect(send).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Alert end (optional)'), { target: { value: '2026-10-01T13:00' } });
  await actor.click(send);
  expect(JSON.parse(screen.getByTestId('operation').textContent!)).toMatchObject({ resource: 'dashboard-alerts', kind: 'create', values: { title: 'Service update', color: '#2563eb', message: 'Please update your workstation.', user_ids: ['user-1'], org_ids: ['org-1'], starts_at: new Date('2026-10-01T12:00').toISOString() } });
});
it('allows withdrawing an existing alert through the audited update', async () => {
  vi.mocked(loadAdminResource).mockResolvedValue({ rows: [{ _admin_id: 'alert-1', message: 'Update', enabled: true, user_ids: ['user-1'], org_ids: [] }], total: 1 } as AdminListResponse);
  render(<AdminTargetedAlerts />);
  fireEvent.click(await screen.findByRole('button', { name: 'Disable alert' }));
  expect(JSON.parse(screen.getByTestId('operation').textContent!)).toEqual({ resource: 'dashboard-alerts', kind: 'update', ids: ['alert-1'], values: { enabled: false } });
});

it('shows active banners only and loads scheduled banners separately', async () => {
  const rows = [
    { _admin_id: 'live', title: 'Live notice', message: 'Live message', enabled: true, user_ids: ['user-1'], org_ids: [] },
    { _admin_id: 'disabled', message: 'Disabled message', enabled: false },
    { _admin_id: 'expired', message: 'Expired message', enabled: true, ends_at: '2000-01-01T00:00:00Z' },
    { _admin_id: 'future', message: 'Future message', enabled: true, starts_at: '2099-01-01T00:00:00Z' },
  ];
  vi.mocked(loadAdminResource).mockResolvedValue({ rows, total: 4 } as AdminListResponse);
  render(<AdminTargetedAlerts />);
  expect(await screen.findByText('Live message')).toBeVisible();
  expect(screen.queryByText('Disabled message')).not.toBeInTheDocument();
  expect(screen.queryByText('Expired message')).not.toBeInTheDocument();
  expect(screen.queryByText('Future message')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Alert message')).not.toBeInTheDocument();
  expect(loadAdminResource).toHaveBeenCalledWith(expect.objectContaining({ bannerView: 'live' }));
  await userEvent.click(screen.getByRole('button', { name: 'Scheduled', exact: true }));
  expect(await screen.findByText('Future message')).toBeVisible();
  expect(screen.queryByText('Live message')).not.toBeInTheDocument();
  expect(loadAdminResource).toHaveBeenCalledWith(expect.objectContaining({ bannerView: 'scheduled', page: 1 }));
});

it('edits the selected card in place and saves message links and schedule without changing its audience', async () => {
  const actor = userEvent.setup();
  const rows = ['First', 'Second'].map((title, index) => ({ _admin_id: `alert-${index}`, title, message: 'Read the guide', color: '#2563eb', enabled: true, user_ids: ['user-1'], org_ids: ['org-1'] }));
  vi.mocked(loadAdminResource).mockResolvedValue({ rows, total: 2 } as AdminListResponse);
  render(<AdminTargetedAlerts />);
  const first = await screen.findByRole('article', { name: 'First' });
  const second = screen.getByRole('article', { name: 'Second' });
  await actor.click(within(first).getByRole('button', { name: 'Edit banner' }));
  const message = within(first).getByLabelText('Alert message') as HTMLTextAreaElement;
  expect(within(second).queryByLabelText('Alert message')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Find recipients')).not.toBeInTheDocument();
  message.setSelectionRange(9, 14);
  await actor.click(within(first).getByRole('button', { name: 'Insert link' }));
  await actor.type(screen.getByLabelText('Link URL'), 'javascript:alert(1)');
  expect(screen.getByRole('button', { name: 'Add link' })).toBeDisabled();
  await actor.clear(screen.getByLabelText('Link URL'));
  await actor.type(screen.getByLabelText('Link URL'), 'https://example.com/guide');
  await actor.click(screen.getByRole('button', { name: 'Add link' }));
  expect(message).toHaveValue('Read the [guide](https://example.com/guide)');
  expect(within(first).getByRole('link', { name: 'guide' })).toHaveAttribute('href', 'https://example.com/guide');
  fireEvent.change(screen.getByLabelText('Alert end (optional)'), { target: { value: '2099-10-01T13:00' } });
  await actor.click(screen.getByRole('button', { name: 'Save changes' }));
  const operation = JSON.parse(screen.getByTestId('operation').textContent!);
  expect(operation).toMatchObject({ resource: 'dashboard-alerts', kind: 'update', ids: ['alert-0'], values: { title: 'First', message: 'Read the [guide](https://example.com/guide)', ends_at: new Date('2099-10-01T13:00').toISOString() } });
  expect(operation.values).not.toHaveProperty('user_ids');
  expect(operation.values).not.toHaveProperty('org_ids');
});

it('discards cancelled inline edits and refreshes the list on demand', async () => {
  vi.mocked(loadAdminResource).mockResolvedValue({ rows: [{ _admin_id: 'alert-1', title: 'Original', message: 'Original message', enabled: true }], total: 1 } as AdminListResponse);
  const { rerender } = render(<AdminTargetedAlerts refreshVersion={0} />);
  await userEvent.click(await screen.findByRole('button', { name: 'Edit banner' }));
  fireEvent.change(screen.getByLabelText('Alert message'), { target: { value: 'Unsaved' } });
  await userEvent.click(screen.getByRole('button', { name: 'Cancel edit' }));
  expect(screen.queryByText('Unsaved')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Edit banner' }));
  expect(screen.getByLabelText('Alert message')).toHaveValue('Original message');
  rerender(<AdminTargetedAlerts refreshVersion={1} />);
  await waitFor(() => expect(loadAdminResource).toHaveBeenCalledTimes(2));
});
