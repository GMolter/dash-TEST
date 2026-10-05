import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { URLShortener } from './URLShortener';
import { SecretSharing } from './SecretSharing';
import { SecretView } from '../pages/SecretView';

const mocks = vi.hoisted(() => ({ insert: vi.fn(), rpc: vi.fn(), copy: vi.fn(), list: vi.fn(), remove: vi.fn(), deleteFilter: vi.fn() }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('../hooks/useOrg', () => ({ useOrg: () => ({ organization: { id: 'org' } }) }));
vi.mock('../lib/supabase', () => ({ supabase: {
  from: () => {
    const deletion = {
      eq: (key: string, value: string) => { mocks.deleteFilter(key, value); return deletion; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(mocks.remove()).then(resolve),
    };
    const query = { select: () => query, eq: () => query, order: mocks.list, maybeSingle: async () => ({ data: { id: 'own-secret' } }), insert: mocks.insert, delete: () => deletion };
    return query;
  },
  rpc: mocks.rpc,
} }));
beforeEach(() => { mocks.list.mockResolvedValue({ data: [] }); mocks.remove.mockResolvedValue({ error: null }); mocks.insert.mockResolvedValue({ error: null }); mocks.rpc.mockResolvedValue({ data: 'private message' }); });

it('defaults short links to personal and explicitly supports org and public', async () => {
  const user = userEvent.setup();
  render(<URLShortener />);
  expect(screen.getByLabelText('Link visibility')).toHaveValue('personal');
  await user.type(screen.getByPlaceholderText('Enter long URL'), 'https://example.com');
  await user.click(screen.getByText('Shorten URL'));
  expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'me', visibility: 'personal', org_id: null }));
  await user.selectOptions(screen.getByLabelText('Link visibility'), 'shared');
  await user.type(screen.getByPlaceholderText('Enter long URL'), 'https://example.com');
  await user.click(screen.getByText('Shorten URL'));
  expect(mocks.insert).toHaveBeenLastCalledWith(expect.objectContaining({ visibility: 'shared', org_id: 'org' }));
});

it('creates a personal secret and presents a copyable link without navigating', async () => {
  const user = userEvent.setup();
  render(<SecretSharing />);
  await user.type(screen.getByPlaceholderText('Enter your secret message...'), 'private message');
  await user.click(screen.getByText('Create Secret Link'));
  const link = await screen.findByLabelText('New secret link');
  expect((link as HTMLInputElement).value).toMatch(/\/s\/[a-f0-9]{64}$/);
  expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'me', org_id: null }));
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it('requires an explicit reveal and identifies an owner preview', async () => {
  const user = userEvent.setup();
  render(<SecretView secretCode="test-code" />);
  expect(mocks.rpc).not.toHaveBeenCalled();
  await user.click(await screen.findByText('Reveal secret'));
  await waitFor(() => expect(screen.getByText('private message')).toBeInTheDocument());
  expect(mocks.rpc).toHaveBeenCalledOnce();
  expect(screen.getByText(/Your preview does not consume/)).toBeInTheDocument();
});

it('lets the creator cancel or confirm deleting a secret', async () => {
  mocks.list.mockResolvedValue({ data: [{ id: 'secret-id', secret_code: 'my-code', viewed: false, expires_at: '2099-01-01', created_at: '2026-01-01' }] });
  const user = userEvent.setup();
  render(<SecretSharing />);
  await user.click(await screen.findByText('Delete secret'));
  await user.click(screen.getByText('Cancel'));
  expect(mocks.remove).not.toHaveBeenCalled();
  await user.click(screen.getByText('Delete secret'));
  await user.click(screen.getByText('Confirm delete'));
  await waitFor(() => expect(screen.queryByText('Delete secret')).not.toBeInTheDocument());
  expect(mocks.deleteFilter).toHaveBeenCalledWith('id', 'secret-id');
  expect(mocks.deleteFilter).toHaveBeenCalledWith('user_id', 'me');
});
it('keeps the secret visible when deletion fails', async () => {
  mocks.list.mockResolvedValue({ data: [{ id: 'secret-id', secret_code: 'my-code', viewed: true, expires_at: '2099-01-01', created_at: '2026-01-01' }] });
  mocks.remove.mockResolvedValue({ error: new Error('Offline') });
  const user = userEvent.setup();
  render(<SecretSharing />);
  await user.click(await screen.findByText('Delete secret'));
  await user.click(screen.getByText('Confirm delete'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not delete');
  expect(screen.getByText(/my-code/)).toBeInTheDocument();
});
