import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { URLShortener } from './URLShortener';
import { SecretSharing } from './SecretSharing';
import { SecretView } from '../pages/SecretView';

const mocks = vi.hoisted(() => ({ insert: vi.fn(), rpc: vi.fn(), copy: vi.fn() }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('../hooks/useOrg', () => ({ useOrg: () => ({ organization: { id: 'org' } }) }));
vi.mock('../lib/supabase', () => ({ supabase: {
  from: () => { const query = { select: () => query, eq: () => query, order: async () => ({ data: [] }), maybeSingle: async () => ({ data: { id: 'own-secret' } }), insert: mocks.insert }; return query; },
  rpc: mocks.rpc,
} }));
beforeEach(() => { mocks.insert.mockResolvedValue({ error: null }); mocks.rpc.mockResolvedValue({ data: 'private message' }); });

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
