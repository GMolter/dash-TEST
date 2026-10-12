import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { EmailAuthentication } from './EmailAuthentication';
const mocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('../lib/supabase', () => ({ supabase: { auth: mocks } }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));
beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(
    {},
    '',
    '/auth/confirm#token_hash=private-token&type=recovery',
  );
  mocks.verifyOtp.mockResolvedValue({ error: null });
});
it('does not consume a token on page load and removes it from the address bar', async () => {
  render(<EmailAuthentication mode="confirm" />);
  expect(mocks.verifyOtp).not.toHaveBeenCalled();
  expect(window.location.hash).toBe('');
  fireEvent.click(
    screen.getByRole('button', { name: 'Continue with this link' }),
  );
  await waitFor(() =>
    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'private-token',
      type: 'recovery',
    }),
  );
  expect(await screen.findByLabelText('New password')).toBeVisible();
});
it('does not offer password changes for signup confirmation', async () => {
  window.history.replaceState(
    {},
    '',
    '/auth/confirm#token_hash=private-token&type=signup',
  );
  render(<EmailAuthentication mode="confirm" />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Continue with this link' }),
  );
  expect(
    await screen.findByText('Email confirmed. You can continue to Olio.'),
  ).toBeVisible();
  expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
});
