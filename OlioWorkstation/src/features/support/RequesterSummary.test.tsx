import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { RequesterSummary } from './RequesterSummary';
import { loadAdminUserAccount } from '../admin/api';
import { useAdminCapabilities } from '../admin/useAdminCapabilities';

vi.mock('../admin/api', () => ({ loadAdminUserAccount: vi.fn() }));
vi.mock('../admin/useAdminCapabilities', () => ({ useAdminCapabilities: vi.fn() }));
beforeEach(() => {
  vi.mocked(useAdminCapabilities).mockReturnValue({ access: null, can: () => true, all: () => true });
  vi.mocked(loadAdminUserAccount).mockResolvedValue({ user: { _admin_id: 'person', display_name: 'Avery Stone', email: 'avery@example.com', role: 'member', _admin_refs: { org_id: { resource: 'organizations', id: 'org', label: 'Example team' } } }, userFields: [], userActions: [], resources: [], canManage: true, totalRecords: 1 });
});
it('shows account information with a deep link to the requester account', async () => {
  render(<RequesterSummary userId="person" fallbackName="Avery" />);
  expect(await screen.findByText('avery@example.com')).toBeVisible();
  expect(screen.getByText('Example team')).toBeVisible();
  expect(screen.getByText('member')).toBeVisible();
  expect(screen.getByRole('link', { name: /Avery Stone/ })).toHaveAttribute('href', '/admin?section=people&account=person');
});
it('does not fetch account details without People access', () => {
  vi.mocked(useAdminCapabilities).mockReturnValue({ access: null, can: () => false, all: () => false });
  render(<RequesterSummary userId="person" fallbackName="Avery" />);
  expect(loadAdminUserAccount).not.toHaveBeenCalled();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
it('offers a retry when account details fail to load', async () => {
  vi.mocked(loadAdminUserAccount).mockRejectedValueOnce(new Error('Offline'));
  render(<RequesterSummary userId="person" fallbackName="Avery" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('avery@example.com')).toBeVisible();
});
