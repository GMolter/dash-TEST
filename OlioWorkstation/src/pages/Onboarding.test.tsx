import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({ signIn: vi.fn(), signUp: vi.fn() }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('../components/AnimatedBackground', () => ({ AnimatedBackground: () => null }));
import { Onboarding } from './Onboarding';

async function signIn() {
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'person@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  await waitFor(() => expect(auth.signIn).toHaveBeenCalledWith('person@example.com', 'password123'));
}

beforeEach(() => {
  vi.resetAllMocks();
  auth.signIn.mockResolvedValue({ success: false, code: 'invalid_credentials' });
  auth.signUp.mockResolvedValue({ success: true, confirmationRequired: true });
});

describe('Unified account flow', () => {
  it('offers creation after invalid credentials and only signs up with explicit consent', async () => {
    render(<Onboarding />);
    expect(screen.queryByRole('button', { name: 'Create account', exact: true })).not.toBeInTheDocument();
    await signIn();
    fireEvent.click(await screen.findByRole('button', { name: 'Yes, create an account' }));
    expect(auth.signUp).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Email address')).toHaveValue('person@example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Create account', exact: true }));
    await screen.findByRole('heading', { name: 'Check your inbox' });
    expect(auth.signUp).toHaveBeenCalledWith('person@example.com', 'password123', undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Back to sign in' }));
    expect(screen.getByLabelText('Password')).toHaveValue('');
  });

  it('does not offer creation for network errors or unconfirmed accounts', async () => {
    auth.signIn.mockResolvedValue({ success: false, code: 'email_not_confirmed' });
    render(<Onboarding />);
    await signIn();
    expect(await screen.findByRole('alert')).toHaveTextContent('Please confirm your email');
    expect(screen.queryByText('Yes, create an account')).not.toBeInTheDocument();
  });

  it('allows retrying the password and clears the account offer', async () => {
    render(<Onboarding />);
    await signIn();
    await screen.findByText('Yes, create an account');
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-password' } });
    expect(screen.queryByText('Yes, create an account')).not.toBeInTheDocument();
    auth.signIn.mockResolvedValue({ success: true });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
    await waitFor(() => expect(auth.signIn).toHaveBeenLastCalledWith('person@example.com', 'correct-password'));
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it('shows unexpected failures and allows another attempt', async () => {
    auth.signIn.mockRejectedValue(new Error('offline'));
    render(<Onboarding />);
    await signIn();
    expect(await screen.findByRole('alert')).toHaveTextContent('check your connection');
    expect(screen.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
  });
});
