import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { AdminEmailPage } from './AdminEmailPage';
import { emailApi } from './emailApi';
vi.mock('./emailApi', () => ({ emailApi: vi.fn() }));
vi.mock('./EmailEditor', () => ({
  EmailEditor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (html: string) => void;
  }) => (
    <textarea
      aria-label="Email message"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(emailApi).mockImplementation(async (action) =>
    action === 'state'
      ? {
          owner: false,
          canSend: false,
          canTemplates: false,
          canHistory: false,
          deliveryEnabled: false,
          preferences: null,
        }
      : {},
  );
});
it('lets an admin without sending rights manage personal notifications', async () => {
  render(<AdminEmailPage />);
  expect(
    await screen.findByRole('button', { name: 'Save preferences' }),
  ).toBeVisible();
  expect(
    screen.queryByRole('tab', { name: 'Compose' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('New signups'));
  fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));
  await waitFor(() =>
    expect(emailApi).toHaveBeenCalledWith(
      'preferences',
      expect.objectContaining({ signup: true }),
    ),
  );
});
it('requires a preview and invalidates it when content changes', async () => {
  vi.mocked(emailApi).mockImplementation(async (action) => {
    if (action === 'state')
      return {
        owner: false,
        canSend: true,
        canTemplates: false,
        canHistory: true,
        deliveryEnabled: true,
      };
    if (action === 'save-draft')
      return {
        draft: {
          id: 'draft',
          revision: 1,
          subject: 'Hello',
          html: 'Body',
          recipients: ['a@example.com'],
          attachment_ids: [],
        },
      };
    if (action === 'preview')
      return {
        token: 'signed',
        subject: 'Hello',
        html: '<p>Body</p>',
        recipients: ['a@example.com'],
        scheduled_at: new Date().toISOString(),
        timezone: 'UTC',
        attachmentCount: 0,
      };
    return { templates: [] };
  });
  render(<AdminEmailPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Compose' }));
  expect(
    screen.queryByRole('button', { name: 'Confirm send' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Preview email' }));
  expect(
    await screen.findByRole('button', { name: 'Confirm send' }),
  ).toBeVisible();
  fireEvent.change(screen.getByLabelText('Subject'), {
    target: { value: 'Changed' },
  });
  expect(
    screen.queryByRole('button', { name: 'Confirm send' }),
  ).not.toBeInTheDocument();
  expect(emailApi).not.toHaveBeenCalledWith('submit', expect.anything());
});
