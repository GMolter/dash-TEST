import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { AdminEmailPage } from './AdminEmailPage';
import { emailApi } from './emailApi';
vi.mock('./emailApi', () => ({ emailApi: vi.fn() }));
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
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
  await waitFor(() => expect(screen.getByRole('button', { name: 'Back to editing' })).toBeEnabled());
  expect(screen.getByRole('dialog', { name: 'Email preview' })).toHaveTextContent('Body');
  expect(screen.getByRole('button', { name: 'Confirm send' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Back to editing' }));
  fireEvent.change(screen.getByLabelText('Subject'), {
    target: { value: 'Changed' },
  });
  expect(
    screen.queryByRole('button', { name: 'Confirm send' }),
  ).not.toBeInTheDocument();
  expect(emailApi).not.toHaveBeenCalledWith('submit', expect.anything());
});
it('shows a failed preview inside the dialog and allows returning to the draft', async () => {
  vi.mocked(emailApi).mockImplementation(async action => {
    if (action === 'state') return { canSend: true, deliveryEnabled: true };
    if (action === 'save-draft') throw new Error('Email storage unavailable.');
    return { templates: [], users: [], organizations: [] };
  });
  render(<AdminEmailPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Compose' }));
  fireEvent.click(screen.getByRole('button', { name: 'Preview email' }));
  const dialog = await screen.findByRole('dialog', { name: 'Email preview' });
  await waitFor(() => expect(dialog).toHaveTextContent('Email storage unavailable.'));
  expect(screen.queryByRole('button', { name: 'Confirm send' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Back to editing' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('moves a confirmed draft into history and explains a queue with no worker pickup', async () => {
  const draft = { id: 'draft-one', revision: 1, subject: 'Test delivery', html: '<p>Hello</p>', recipients: ['a@example.com'], attachment_ids: [] };
  let submitted = false;
  vi.mocked(emailApi).mockImplementation(async action => {
    if (action === 'state') return { canSend: true, canHistory: true, owner: true, deliveryEnabled: true };
    if (action === 'drafts') return { drafts: submitted ? [] : [draft] };
    if (action === 'save-draft') return { draft };
    if (action === 'preview') return { ...draft, token: 'signed', scheduled_at: new Date().toISOString(), timezone: 'UTC', attachmentCount: 0 };
    if (action === 'submit') { submitted = true; return { id: 'message-one', status: 'queued' }; }
    if (action === 'history') return {
      messages: [{ ...draft, scheduled_at: new Date().toISOString(), timezone: 'UTC', email_jobs: [{ id: 'job-one', recipient: 'a@example.com', status: 'queued', attempts: 0, email_attempts: [] }] }],
      system: [], health: { paused: false, last_dispatch_at: null }, deliveryEnabled: true,
    };
    return { templates: [], users: [], organizations: [] };
  });
  render(<AdminEmailPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Drafts' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Preview email' }));
  const confirm = await screen.findByRole('button', { name: 'Confirm send' });
  await waitFor(() => expect(confirm).toBeEnabled());
  fireEvent.click(confirm);
  await waitFor(() => expect(screen.getByRole('tab', { name: 'Outgoing history' })).toHaveAttribute('aria-selected', 'true'));
  expect(await screen.findByText(/No recent worker pickup/)).toBeVisible();
  expect(screen.getByText('0 sending attempts')).toBeVisible();
  fireEvent.click(screen.getByRole('tab', { name: 'Drafts' }));
  expect(await screen.findByText('No saved drafts.')).toBeVisible();
  expect(screen.queryByText('Test delivery')).not.toBeInTheDocument();
});
