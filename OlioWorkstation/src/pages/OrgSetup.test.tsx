import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ joinOrg: vi.fn(), createOrg: vi.fn(), signOut: vi.fn(), background: vi.fn() }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ signOut: mocks.signOut }) }));
vi.mock('../hooks/useOrg', () => ({ useOrg: () => mocks }));
vi.mock('../components/AnimatedBackground', () => ({ AnimatedBackground: (props: unknown) => { mocks.background(props); return null; } }));
import { OrgSetup } from './OrgSetup';
beforeEach(() => { vi.resetAllMocks(); mocks.joinOrg.mockResolvedValue({ success: true }); mocks.createOrg.mockResolvedValue({ success: true }); });

describe('Organization setup forms', () => {
  it('uses the selected app background and submits a leading-zero code with Enter', async () => {
    render(<OrgSetup backgroundTheme="contour-drift" backgroundPreset="teal" />);
    expect(mocks.background).toHaveBeenCalledWith({ theme: 'contour-drift', preset: 'teal' });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Join an organization/ }));
    await user.type(screen.getByLabelText('Organization code'), '0936{Enter}');
    await waitFor(() => expect(mocks.joinOrg).toHaveBeenCalledExactlyOnceWith('0936'));
  });
  it('creates a named organization with the same form flow', async () => {
    render(<OrgSetup />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Create an organization/ }));
    await user.type(screen.getByLabelText('Organization name'), ' Team Space {Enter}');
    await waitFor(() => expect(mocks.createOrg).toHaveBeenCalledExactlyOnceWith('Team Space'));
  });
  it('recovers from rejected requests and clears errors when changing paths', async () => {
    mocks.joinOrg.mockRejectedValue(new Error('network'));
    render(<OrgSetup />);
    fireEvent.click(screen.getByRole('button', { name: /Join an organization/ }));
    fireEvent.change(screen.getByLabelText('Organization code'), { target: { value: '0936' } });
    fireEvent.click(screen.getByRole('button', { name: 'Join organization', exact: true }));
    expect(await screen.findByRole('alert')).toHaveTextContent('check your connection');
    expect(screen.getByRole('button', { name: 'Join organization', exact: true })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: /Create an organization/ }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('prevents duplicate submissions while the transaction is pending', async () => {
    mocks.joinOrg.mockReturnValue(new Promise(() => {}));
    render(<OrgSetup />);
    fireEvent.click(screen.getByRole('button', { name: /Join an organization/ }));
    fireEvent.change(screen.getByLabelText('Organization code'), { target: { value: '0936' } });
    const form = screen.getByLabelText('Organization code').closest('form')!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(mocks.joinOrg).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Joining…' })).toBeDisabled();
  });
});
