import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { HelpPage } from './HelpPage';
const articles = [
  { id: '1', slug: 'quick-links', title: 'Quick Links', summary: 'Organize personal bookmarks' },
  { id: '2', slug: 'project-board', title: 'Project Board', summary: 'Move cards between lanes' },
  { id: '3', slug: 'custom-guide', title: 'Custom guide', summary: 'A guide from your team' },
];
afterEach(() => vi.unstubAllGlobals());
it('browses every guide, filters topics, and searches visible results', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ articles }) }));
  render(<HelpPage />);
  expect(await screen.findByRole('link', { name: /Custom guide/ })).toHaveAttribute('href', '/help/article/custom-guide');
  fireEvent.click(screen.getByRole('button', { name: 'Projects' }));
  expect(screen.getByRole('link', { name: /Project Board/ })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Quick Links/ })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'Search help articles' }), { target: { value: 'personal bookmarks' } });
  expect(screen.getByRole('link', { name: /Quick Links/ })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Project Board/ })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'no such guide' } });
  expect(screen.getByText('No matching guides yet.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show all guides' }));
  expect(screen.getByRole('link', { name: /Custom guide/ })).toBeInTheDocument();
});
it('shows a retry action when the server fails', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValue({ ok: true, json: async () => ({ articles }) }));
  render(<HelpPage />);
  const alert = await screen.findByRole('alert');
  fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('link', { name: /Quick Links/ })).toBeInTheDocument();
});
