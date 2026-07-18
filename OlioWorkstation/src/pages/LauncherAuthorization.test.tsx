import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LauncherAuthorization } from './LauncherAuthorization';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ session: { access_token: 'synthetic-browser-session' } }),
}));

const requestId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const displayCode = '23456-789AB';

describe('LauncherAuthorization', () => {
  it('shows safe request metadata and explains the limited read-only permission', async () => {
    render(<LauncherAuthorization requestId={requestId} displayCode={displayCode} authorize={vi.fn(async () => ({
      state: 'waiting',
      device_name: '<img src=x onerror=alert(1)>',
      expires_at: '2026-07-15T20:00:00.000Z',
    }))} />);
    expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText(displayCode)).toBeInTheDocument();
    expect(screen.getByText(/read-only access to your private Quick Pastes/)).toBeInTheDocument();
    expect(screen.getByText(/cannot create, edit, delete, reorder, favorite, or share/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve launcher' }).className).toContain('focus-visible:ring-2');
  });

  it('approves once and prevents accidental double approval', async () => {
    let resolveApproval: ((value: { state: string }) => void) | undefined;
    const authorize = vi.fn(async (action: 'inspect' | 'approve' | 'deny') => {
      if (action === 'inspect') return { state: 'waiting', device_name: 'Test Laptop', expires_at: '2026-07-15T20:00:00.000Z' };
      return new Promise<{ state: string }>((resolve) => { resolveApproval = resolve; });
    });
    const user = userEvent.setup();
    render(<LauncherAuthorization requestId={requestId} displayCode={displayCode} authorize={authorize} />);
    const approve = await screen.findByRole('button', { name: 'Approve launcher' });
    await user.dblClick(approve);
    expect(authorize.mock.calls.filter(([action]) => action === 'approve')).toHaveLength(1);
    await act(async () => resolveApproval?.({ state: 'approved' }));
    expect(screen.getByRole('status')).toHaveTextContent('Approved');
  });

  it('supports explicit denial and recoverable inspection failure', async () => {
    const user = userEvent.setup();
    const authorize = vi.fn()
      .mockRejectedValueOnce(new Error('synthetic'))
      .mockResolvedValueOnce({ state: 'waiting', device_name: 'Test Laptop', expires_at: '2026-07-15T20:00:00.000Z' })
      .mockResolvedValueOnce({ state: 'denied' });
    render(<LauncherAuthorization requestId={requestId} displayCode={displayCode} authorize={authorize} />);
    expect(await screen.findByRole('alert')).toHaveTextContent("couldn't check");
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await user.click(await screen.findByRole('button', { name: 'Deny' }));
    expect(screen.getByRole('status')).toHaveTextContent('Denied');
    expect(screen.getByRole('status')).toHaveTextContent('close automatically in 8 seconds');
    await user.click(screen.getByRole('button', { name: 'Keep this tab open' }));
    expect(screen.getByRole('status')).toHaveTextContent('Automatic closing stopped');
  });

  it('automatically closes an approved or denied tab when the countdown ends', async () => {
    const closeTab = vi.fn(() => true);
    render(
      <LauncherAuthorization
        requestId={requestId}
        displayCode={displayCode}
        authorize={vi.fn(async () => ({ state: 'approved' }))}
        closeTab={closeTab}
        autoCloseSeconds={0}
      />,
    );

    await waitFor(() => expect(closeTab).toHaveBeenCalledTimes(1));
  });

  it.each(['expired', 'cancelled', 'exchanged', 'invalid', 'rate_limited'])(
    'handles %s without showing approval controls',
    async (state) => {
      render(<LauncherAuthorization requestId={requestId} displayCode={displayCode} authorize={vi.fn(async () => ({ state }))} />);
      expect(await screen.findByText(/expired|cancelled|already been used|unavailable|Too many attempts/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Approve launcher' })).not.toBeInTheDocument();
    },
  );
});
