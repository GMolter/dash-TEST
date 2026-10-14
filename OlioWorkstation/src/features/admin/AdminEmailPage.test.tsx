import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { AdminEmailPage } from './AdminEmailPage';
import { emailApi } from './emailApi';
vi.mock('./emailApi', () => ({ emailApi: vi.fn() }));
it('starts a new message from an account link and keeps advanced tools collapsed', async () => {
  window.history.replaceState(null, '', '/admin?section=email&contactUser=opaque.account');
  vi.mocked(emailApi).mockImplementation(async action => {
    if (action === 'state') return { owner: true, canSend: true, canHistory: true, deliveryEnabled: true };
    if (action === 'contact-user') return { person: { email: 'avery@example.com', display_name: 'Avery Stone', organization: 'Design team', joined: '2026-01-01' } };
    return { templates: [], users: [], organizations: [] };
  });
  try {
    render(<AdminEmailPage />);
    expect(await screen.findByRole('region', { name: 'Recipient account summary' })).toHaveTextContent('Avery Stone');
    expect(screen.getByRole('button', { name: 'Remove avery@example.com' })).toBeVisible();
    expect(screen.getByLabelText('Subject')).toHaveValue('');
    expect(screen.getByText('More email tools').closest('details')).not.toHaveAttribute('open');
    fireEvent.click(screen.getByRole('button', { name: 'New message' }));
    expect(screen.queryByRole('region', { name: 'Recipient account summary' })).not.toBeInTheDocument();
  } finally { window.history.replaceState(null, '', '/'); }
});
it('switches recipient previews without discarding the confirmation token', async () => {
  vi.mocked(emailApi).mockImplementation(async (action, input) => {
    if (action === 'state') return { canSend: true, deliveryEnabled: true };
    if (action === 'save-draft') return { draft: { id: 'draft', revision: 1, subject: 'Hello {{firstname}}', html: '<p>Hi</p>', recipients: ['a@example.com', 'b@example.com'], attachment_ids: [] } };
    if (action === 'preview') return { token: 'signed', subject: 'Hello Avery', html: '<p>Hi Avery</p>', recipients: ['a@example.com', 'b@example.com'], recipient: 'a@example.com', attachmentCount: 0 };
    if (action === 'preview-recipient') return { recipient: input?.recipient, subject: 'Hello Blair', html: '<p>Hi Blair</p>' };
    return { templates: [], users: [], organizations: [] };
  });
  render(<AdminEmailPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Preview email' }));
  const select = await screen.findByLabelText('Preview for');
  await waitFor(() => expect(select).toBeEnabled());
  fireEvent.change(select, { target: { value: 'b@example.com' } });
  expect(await screen.findByText('Hello Blair')).toBeVisible();
  const confirm = screen.getByRole('button', { name: 'Confirm send' });
  await waitFor(() => expect(confirm).toBeEnabled());
  fireEvent.click(confirm);
  await waitFor(() => expect(emailApi).toHaveBeenCalledWith('submit', expect.objectContaining({ token: 'signed', confirmation: 'SEND' })));
});
it('opens the exact failed job from a notification link', async () => {
  window.history.replaceState(null, '', '/admin?section=email&emailJob=job-one');
  vi.mocked(emailApi).mockImplementation(async action => {
    if (action === 'state') return { owner: true, canHistory: true, canSend: true };
    return { messages: [], system: [], templates: [] };
  });
  try {
    render(<AdminEmailPage />);
    await waitFor(() => expect(emailApi).toHaveBeenCalledWith('history', { global: true, page: 0, job_id: 'job-one' }));
    expect(screen.getByRole('tab', { name: 'Outgoing history' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Show all messages' }));
    await waitFor(() => expect(emailApi).toHaveBeenCalledWith('history', { global: true, page: 0 }));
  } finally { window.history.replaceState(null, '', '/'); }
});
it('saves notification preferences for the selected admin without changing personal preferences', async () => {
  vi.mocked(emailApi).mockImplementation(async action => {
    if (action === 'state') return { owner: true, canSend: false, preferences: { signup: false, organization: false, review: false, failure: false } };
    if (action === 'administration') return { admins: [{ id: 'other-admin', email: 'admin@example.com', app_owner: false }], preferences: [], health: { paused: false } };
    return {};
  });
  render(<AdminEmailPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Administration' }));
  await screen.findByRole('option', { name: 'admin@example.com' });
  fireEvent.change(screen.getByLabelText('Manage an admin'), { target: { value: 'other-admin' } });
  const panel = screen.getByRole('region', { name: 'Selected admin notification preferences' });
  fireEvent.click(within(panel).getByLabelText('New signups'));
  fireEvent.click(within(panel).getByRole('button', { name: 'Save admin preferences' }));
  await waitFor(() => expect(emailApi).toHaveBeenCalledWith('preferences', { user_id: 'other-admin', signup: true, organization: false, review: false, failure: false }));
  await screen.findByText('Admin notification preferences saved.');
  fireEvent.click(screen.getByRole('tab', { name: 'My notifications' }));
  await waitFor(() => expect(screen.getByLabelText('New signups')).not.toBeChecked());
});
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
  expect(screen.getByTitle('Rendered email')).toHaveAttribute('srcdoc', '<p>Body</p>');
  expect(screen.getByTitle('Rendered email')).toHaveAttribute('sandbox', '');
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
  fireEvent.click(screen.getByText('Delivery diagnostics'));
  expect(await screen.findByText(/No recent worker pickup/)).toBeVisible();
  expect(screen.getByText('0 sending attempts')).toBeVisible();
  fireEvent.click(screen.getByRole('tab', { name: 'Drafts' }));
  expect(await screen.findByText('No saved drafts.')).toBeVisible();
  expect(screen.queryByText('Test delivery')).not.toBeInTheDocument();
});
