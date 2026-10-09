import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { FeaturePlanAttachment } from './FeaturePlanAttachment';
import { readPlanFile, savePlanFile, downloadPlanFile } from './featurePlanFiles';

vi.mock('./featurePlanFiles', () => ({ readPlanFile: vi.fn(), savePlanFile: vi.fn(), downloadPlanFile: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readPlanFile).mockResolvedValue({ name: 'plan.md', content: '# Plan' });
  vi.mocked(savePlanFile).mockResolvedValue();
  vi.mocked(downloadPlanFile).mockResolvedValue();
});
it('uploads a plan to the right idea and exposes download and replace controls', async () => {
  const actor = userEvent.setup();
  render(<FeaturePlanAttachment ideaId="idea-1" title="Search" />);
  await actor.upload(screen.getByLabelText('Upload planning file for Search'), new File(['# Plan'], 'plan.md', { type: 'text/markdown' }));
  expect(await screen.findByText('Planning file saved.')).toBeInTheDocument();
  expect(savePlanFile).toHaveBeenCalledWith('idea-1', { name: 'plan.md', content: '# Plan' });
  expect(screen.getByText('Replace plan')).toBeInTheDocument();
  await actor.click(screen.getByRole('button', { name: 'Download plan.md' }));
  expect(downloadPlanFile).toHaveBeenCalledWith('idea-1');
});
it('keeps the old plan available after a failed replacement and allows retry', async () => {
  vi.mocked(savePlanFile).mockRejectedValueOnce(new Error('Upload failed'));
  const actor = userEvent.setup();
  render(<FeaturePlanAttachment ideaId="idea-1" title="Search" initialName="old.txt" />);
  const file = new File(['# Plan'], 'plan.md');
  await actor.upload(screen.getByLabelText('Upload planning file for Search'), file);
  expect(await screen.findByRole('alert')).toHaveTextContent('Upload failed');
  expect(screen.getByRole('button', { name: 'Download old.txt' })).toBeEnabled();
  await actor.upload(screen.getByLabelText('Upload planning file for Search'), file);
  expect(await screen.findByRole('button', { name: 'Download plan.md' })).toBeEnabled();
});
it('requires confirmation before removing the attachment', async () => {
  const actor = userEvent.setup();
  render(<FeaturePlanAttachment ideaId="idea-1" title="Search" initialName="old.txt" />);
  await actor.click(screen.getByRole('button', { name: 'Remove plan' }));
  expect(savePlanFile).not.toHaveBeenCalled();
  await actor.click(screen.getByRole('button', { name: 'Confirm removal' }));
  expect(await screen.findByText('Planning file removed.')).toBeInTheDocument();
  expect(savePlanFile).toHaveBeenCalledWith('idea-1', null);
  expect(screen.queryByRole('button', { name: 'Download old.txt' })).not.toBeInTheDocument();
});
