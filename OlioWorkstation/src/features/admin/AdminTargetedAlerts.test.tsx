import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { AdminTargetedAlerts } from './AdminTargetedAlerts';
import { loadAdminResource } from './api';
import type { AdminListResponse } from './types';

vi.mock('./api', () => ({ loadAdminResource: vi.fn() }));
vi.mock('./AdminOperationDialog', () => ({ AdminOperationDialog: ({ operation }: { operation: unknown }) => operation ? <output data-testid="operation">{JSON.stringify(operation)}</output> : null }));
beforeEach(() => {
  vi.mocked(loadAdminResource).mockImplementation(async ({ resource }) => ({ rows: resource === 'users' ? [{ _admin_id: 'user-1', display_name: 'Alex', email: 'alex@example.com' }] : resource === 'organizations' ? [{ _admin_id: 'org-1', name: 'Support' }] : [], total: 0 }) as AdminListResponse);
});
it('requires a message and recipients, preserves selected users when adding organizations, and submits an audited alert', async () => {
  const actor = userEvent.setup();
  render(<AdminTargetedAlerts />);
  const send = screen.getByRole('button', { name: 'Send targeted alert' });
  expect(send).toBeDisabled();
  await actor.type(screen.getByLabelText('Alert message'), 'Please update your workstation.');
  await actor.click(await screen.findByLabelText('Alex (alex@example.com)'));
  await actor.selectOptions(screen.getByLabelText('Recipient type'), 'organizations');
  await actor.click(await screen.findByLabelText('Support'));
  fireEvent.change(screen.getByLabelText('Alert start (optional)'), { target: { value: '2026-10-01T12:00' } });
  fireEvent.change(screen.getByLabelText('Alert end (optional)'), { target: { value: '2026-10-01T11:00' } });
  expect(send).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Alert end (optional)'), { target: { value: '2026-10-01T13:00' } });
  await actor.click(send);
  expect(JSON.parse(screen.getByTestId('operation').textContent!)).toMatchObject({ resource: 'dashboard-alerts', kind: 'create', values: { message: 'Please update your workstation.', user_ids: ['user-1'], org_ids: ['org-1'], starts_at: new Date('2026-10-01T12:00').toISOString() } });
});
it('allows withdrawing an existing alert through the audited update', async () => {
  vi.mocked(loadAdminResource).mockResolvedValue({ rows: [{ _admin_id: 'alert-1', message: 'Update', enabled: true, user_ids: ['user-1'], org_ids: [] }], total: 1 } as AdminListResponse);
  render(<AdminTargetedAlerts />);
  fireEvent.click(await screen.findByRole('button', { name: 'Disable alert' }));
  expect(JSON.parse(screen.getByTestId('operation').textContent!)).toEqual({ resource: 'dashboard-alerts', kind: 'update', ids: ['alert-1'], values: { enabled: false } });
});
