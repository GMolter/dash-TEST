import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { TargetedAlerts } from './TargetedAlerts';

const mocks = vi.hoisted(() => ({ user: { id: 'user-1' }, order: vi.fn() }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('../lib/supabase', () => ({ supabase: { from: () => ({ select: () => ({ order: mocks.order }) }) } }));
beforeEach(() => {
  mocks.user = { id: 'user-1' };
  mocks.order.mockReset().mockResolvedValue({ data: [{ id: 'alert-1', message: 'Private notice', title: 'Team update', color: '#2563eb' }], error: null });
});
it('renders authorized alerts and removes them when the server withdraws access', async () => {
  render(<TargetedAlerts />);
  expect(await screen.findByText('Private notice')).toBeInTheDocument();
  expect(screen.getByText('Team update').parentElement).toHaveStyle({ backgroundColor: '#2563eb', color: '#ffffff' });
  expect(screen.queryByText('Admin alert')).toBeNull();
  mocks.order.mockResolvedValue({ data: [], error: null });
  act(() => window.dispatchEvent(new Event('olio-banner-updated')));
  await waitFor(() => expect(screen.queryByText('Private notice')).toBeNull());
});
it('never carries one account’s alert into another account', async () => {
  const { rerender } = render(<TargetedAlerts />);
  await screen.findByText('Private notice');
  mocks.order.mockReturnValue(new Promise(() => {}));
  mocks.user = { id: 'user-2' };
  rerender(<TargetedAlerts />);
  expect(screen.queryByText('Private notice')).toBeNull();
});
it('clears alerts on a failed refresh', async () => {
  render(<TargetedAlerts />);
  await screen.findByText('Private notice');
  mocks.order.mockResolvedValue({ data: null, error: { message: 'Session expired' } });
  act(() => window.dispatchEvent(new Event('olio-banner-updated')));
  await waitFor(() => expect(screen.queryByText('Private notice')).toBeNull());
});
