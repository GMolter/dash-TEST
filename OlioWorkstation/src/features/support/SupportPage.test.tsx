import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { SupportPage } from './SupportPage';
import { listTickets, loadTicket, markRead, mutateTicket } from './api';

vi.mock('./api', async original => ({ ...await original<typeof import('./api')>(), listTickets: vi.fn(), loadTicket: vi.fn(), markRead: vi.fn(), mutateTicket: vi.fn() }));
const ticket = { id: 'ticket-one', reference: 12, user_id: 'user', requester: 'Avery', category: 'account' as const, description: 'Cannot open my dashboard', status: 'open' as const, revision: 1, created_at: '2026-10-14T12:00:00Z', updated_at: '2026-10-14T12:00:00Z' };
beforeEach(() => {
  window.history.replaceState(null, '', '/support');
  vi.mocked(listTickets).mockResolvedValue({ tickets: [ticket], total: 1 });
  vi.mocked(loadTicket).mockResolvedValue({ ticket, events: [] });
  vi.mocked(markRead).mockResolvedValue();
  vi.mocked(mutateTicket).mockResolvedValue(ticket.id);
});
it('submits category and description, confirms success and links the new ticket', async () => {
  render(<SupportPage />);
  fireEvent.click(screen.getByRole('button', { name: 'New ticket' }));
  expect(screen.getByRole('button', { name: 'Submit ticket' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Problem'), { target: { value: 'account' } });
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Please help' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit ticket' }));
  expect(await screen.findByText('Your support ticket has been submitted. An admin will be in contact shortly.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'View ticket' })).toHaveAttribute('href', '/support?ticket=ticket-one');
  expect(mutateTicket).toHaveBeenCalledWith(expect.objectContaining({ action: 'created', category: 'account', body: 'Please help' }));
  expect(await screen.findByText('Cannot open my dashboard')).toBeVisible();
  await waitFor(() => expect(markRead).toHaveBeenCalledWith(ticket.id, 1));
});
it('preserves input and request ID when retrying a lost submission response', async () => {
  vi.mocked(mutateTicket).mockRejectedValueOnce(new Error('Connection lost'));
  render(<SupportPage />);
  fireEvent.click(screen.getByRole('button', { name: 'New ticket' }));
  fireEvent.change(screen.getByLabelText('Problem'), { target: { value: 'other' } });
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Keep my text' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit ticket' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection lost');
  expect(screen.getByLabelText('Description')).toHaveValue('Keep my text');
  fireEvent.click(screen.getByRole('button', { name: 'Submit ticket' }));
  await waitFor(() => expect(mutateTicket).toHaveBeenCalledTimes(2));
  expect(vi.mocked(mutateTicket).mock.calls[0][0].request).toBe(vi.mocked(mutateTicket).mock.calls[1][0].request);
});
it('loads completed deep links read-only for users', async () => {
  window.history.replaceState(null, '', '/support?ticket=ticket-one');
  vi.mocked(loadTicket).mockResolvedValue({ ticket: { ...ticket, status: 'completed', revision: 3 }, events: [{ id: 'event', sequence: 3, author: 'Sam', admin: true, kind: 'completed', body: '', created_at: ticket.created_at }] });
  render(<SupportPage />);
  expect(await screen.findByLabelText('Reply')).toBeDisabled();
  expect(screen.getByText('Marked the ticket completed.')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Reopen ticket' })).not.toBeInTheDocument();
  expect(markRead).toHaveBeenCalledWith(ticket.id, 3);
});
it('lets admins reply and complete, retaining unsent replies after failure', async () => {
  window.history.replaceState(null, '', '/admin?section=support&ticket=ticket-one');
  vi.mocked(mutateTicket).mockRejectedValueOnce(new Error('Try again'));
  render(<SupportPage admin />);
  fireEvent.change(await screen.findByLabelText('Reply'), { target: { value: 'We can help' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Try again');
  expect(screen.getByLabelText('Reply')).toHaveValue('We can help');
  fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
  await waitFor(() => expect(screen.getByLabelText('Reply')).toHaveValue(''));
  fireEvent.click(screen.getByRole('button', { name: 'Mark completed' }));
  await waitFor(() => expect(mutateTicket).toHaveBeenCalledWith(expect.objectContaining({ action: 'completed', ticket: ticket.id })));
});
it('filters history and displays an empty state', async () => {
  vi.mocked(listTickets).mockResolvedValue({ tickets: [], total: 0 });
  render(<SupportPage />);
  expect(await screen.findByText('No open tickets')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Completed' }));
  expect(await screen.findByText('No completed tickets')).toBeVisible();
  expect(listTickets).toHaveBeenLastCalledWith(false, 'completed', 0);
});
it('supports opening and completing the new-ticket form by keyboard', async () => {
  const user = userEvent.setup();
  render(<SupportPage />);
  screen.getByRole('button', { name: 'New ticket' }).focus();
  await user.keyboard('{Enter}');
  await user.tab();
  expect(screen.getByRole('button', { name: 'Back to tickets' })).toHaveFocus();
  await user.tab();
  expect(screen.getByLabelText('Problem')).toHaveFocus();
  await user.selectOptions(screen.getByLabelText('Problem'), 'other');
  await user.tab();
  await user.keyboard('Keyboard request');
  await user.tab();
  expect(screen.getByRole('button', { name: 'Submit ticket' })).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(await screen.findByRole('link', { name: 'View ticket' })).toBeVisible();
});
