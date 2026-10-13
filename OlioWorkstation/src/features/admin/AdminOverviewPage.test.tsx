import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AdminOverviewPage } from './AdminOverviewPage';
import type { AdminOverview } from './types';

const overview: AdminOverview = { isOwner: true, metrics: { projects: 987, pendingAdminReviews: 2 }, recentAudit: [{ id: 'event', action: 'update', resource: 'users' }], resources: [] };
const sections = ['people', 'organizations', 'reviews', 'banner', 'email', 'platform', 'features', 'workspace', 'integrations', 'audit'];

it('searches destinations by task and navigates to the selected area', () => {
  const navigate = vi.fn();
  render(<AdminOverviewPage overview={overview} allowedSections={sections} onNavigate={navigate} />);
  const directory = screen.getByRole('navigation', { name: 'Admin destinations' });
  expect(within(directory).getAllByRole('button')).toHaveLength(10);
  expect(screen.queryByText('987')).not.toBeInTheDocument();
  expect(screen.queryByText('Recent activity')).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'password' } });
  expect(within(directory).getAllByRole('button')).toHaveLength(1);
  fireEvent.click(within(directory).getByRole('button', { name: /People/ }));
  expect(navigate).toHaveBeenCalledWith('people');
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'no-such-area' } });
  expect(screen.getByRole('status')).toHaveTextContent('No destinations found.');
  fireEvent.click(screen.getByRole('button', { name: 'Clear destination search' }));
  expect(within(directory).getAllByRole('button')).toHaveLength(10);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'recipients' } });
  fireEvent.click(within(directory).getByRole('button', { name: /Email/ }));
  expect(navigate).toHaveBeenCalledWith('email');
});

it.each([
  ['full admin', sections.filter(section => section !== 'reviews')],
  ['people admin', ['people']],
  ['content admin', ['banner', 'platform', 'features']],
  ['custom admin', ['workspace', 'integrations']],
])('uses the same directory for %s and only exposes allowed destinations', (_, allowed) => {
  const navigate = vi.fn();
  render(<AdminOverviewPage overview={{ ...overview, isOwner: false }} allowedSections={allowed} onNavigate={navigate} />);
  expect(screen.getByRole('heading', { name: 'Where would you like to go?' })).toBeVisible();
  const directory = screen.getByRole('navigation', { name: 'Admin destinations' });
  expect(within(directory).getAllByRole('button')).toHaveLength(allowed.length);
  within(directory).getAllByRole('button').forEach(button => fireEvent.click(button));
  expect(navigate.mock.calls.map(([section]) => section).sort()).toEqual([...allowed].sort());
  expect(screen.queryByText(/awaiting review/)).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'approve' } });
  expect(within(directory).queryByRole('button')).not.toBeInTheDocument();
});

it('shows actionable reviews only for owners with access', () => {
  const navigate = vi.fn();
  render(<AdminOverviewPage overview={overview} allowedSections={sections} onNavigate={navigate} />);
  fireEvent.click(screen.getByRole('button', { name: '2 account requests awaiting review' }));
  expect(navigate).toHaveBeenCalledWith('reviews');
});
