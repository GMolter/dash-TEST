import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { AdminFeaturesPage } from './AdminFeaturesPage';
import { listFeatureIdeas, saveFeatureIdea } from './adminFeatures';

vi.mock('./adminFeatures', () => ({
  listFeatureIdeas: vi.fn(), saveFeatureIdea: vi.fn(),
  featureStatuses: { idea: 'Idea', in_progress: 'In progress', completed: 'Completed' },
}));
const idea = { id: 'feature-1', title: 'Bulk bookmarks', notes: 'Move folders between profiles', status: 'idea' as const, created_at: '2026-10-08T20:00:00Z' };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listFeatureIdeas).mockResolvedValue({ rows: [idea], total: 1 });
  vi.mocked(saveFeatureIdea).mockResolvedValue();
});
it('adds ideas with optional notes and a selected status', async () => {
  const actor = userEvent.setup();
  render(<AdminFeaturesPage refreshVersion={0} />);
  await actor.click(screen.getByRole('button', { name: 'Add idea' }));
  expect(screen.getByRole('button', { name: 'Save idea' })).toBeDisabled();
  await actor.type(screen.getByRole('textbox', { name: 'Title' }), 'Better search');
  await actor.type(screen.getByRole('textbox', { name: 'Notes (optional)' }), 'Search all folders');
  await actor.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'in_progress');
  await actor.click(screen.getByRole('button', { name: 'Save idea' }));
  await waitFor(() => expect(saveFeatureIdea).toHaveBeenCalledWith({ title: 'Better search', notes: 'Search all folders', status: 'in_progress' }, undefined, false));
  expect(await screen.findByText('Idea added.')).toBeInTheDocument();
});
it('changes status inline without overwriting another admin’s title or notes', async () => {
  const actor = userEvent.setup();
  render(<AdminFeaturesPage refreshVersion={0} />);
  await actor.selectOptions(await screen.findByRole('combobox', { name: 'Status for Bulk bookmarks' }), 'completed');
  expect(saveFeatureIdea).toHaveBeenCalledWith({ title: idea.title, notes: idea.notes, status: 'completed' }, idea.id, true);
});
it('keeps a failed edit available to retry', async () => {
  vi.mocked(saveFeatureIdea).mockRejectedValue(new Error('Unable to save'));
  const actor = userEvent.setup();
  render(<AdminFeaturesPage refreshVersion={0} />);
  await actor.click(await screen.findByRole('button', { name: 'Edit Bulk bookmarks' }));
  await actor.type(screen.getByRole('textbox', { name: 'Title' }), ' improved');
  await actor.click(screen.getByRole('button', { name: 'Save idea' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save');
  expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Bulk bookmarks improved');
});
it('filters status and reloads on refresh', async () => {
  const actor = userEvent.setup();
  const view = render(<AdminFeaturesPage refreshVersion={0} />);
  await screen.findByText('Bulk bookmarks');
  await actor.selectOptions(screen.getByRole('combobox', { name: 'Filter feature status' }), 'completed');
  await waitFor(() => expect(listFeatureIdeas).toHaveBeenLastCalledWith(1, 'completed'));
  const calls = vi.mocked(listFeatureIdeas).mock.calls.length;
  view.rerender(<AdminFeaturesPage refreshVersion={1} />);
  await waitFor(() => expect(listFeatureIdeas).toHaveBeenCalledTimes(calls + 1));
});
