import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LauncherDevices } from './LauncherDevices';
import type { LauncherDevice } from '../features/launcherDevices/model';
import type { LauncherDeviceRepository } from '../features/launcherDevices/repository';
import { LauncherDeviceDataError } from '../features/launcherDevices/repository';

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-a' } }) }));

const device: LauncherDevice = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  device_identifier: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  device_name: '<script>hostile name</script>',
  connected_at: '2026-07-15T18:00:00.000Z',
  last_used_at: null,
  revoked_at: null,
  status: 'connected',
};

describe('LauncherDevices', () => {
  it('shows loading and empty states', async () => {
    let resolveList: ((rows: LauncherDevice[]) => void) | undefined;
    const repository: LauncherDeviceRepository = {
      list: () => new Promise((resolve) => { resolveList = resolve; }),
      revoke: vi.fn(),
    };
    render(<LauncherDevices repository={repository} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading launcher devices');
    await act(async () => resolveList?.([]));
    expect(screen.getByText('No Olio Launcher devices are connected.')).toBeInTheDocument();
  });

  it('shows a recoverable content-free load error', async () => {
    const repository: LauncherDeviceRepository = {
      list: vi.fn().mockRejectedValueOnce(new Error('database detail')).mockResolvedValueOnce([]),
      revoke: vi.fn(),
    };
    const user = userEvent.setup();
    render(<LauncherDevices repository={repository} />);
    expect(await screen.findByRole('alert')).not.toHaveTextContent('database detail');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No Olio Launcher devices are connected.')).toBeInTheDocument();
  });

  it('reports an unapplied launcher migration without backend detail', async () => {
    const repository: LauncherDeviceRepository = {
      list: vi.fn().mockRejectedValue(new LauncherDeviceDataError('setup')),
      revoke: vi.fn(),
    };
    render(<LauncherDevices repository={repository} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Launcher connections are not enabled on this Workstation deployment yet.',
    );
  });

  it('renders hostile names as text and requires destructive confirmation', async () => {
    const repository: LauncherDeviceRepository = { list: vi.fn(async () => [device]), revoke: vi.fn(async () => undefined) };
    const user = userEvent.setup();
    render(<LauncherDevices repository={repository} />);
    expect(await screen.findByText(device.device_name)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(device.device_name);
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'Remove launcher' }));
    expect(repository.revoke).toHaveBeenCalledWith(device.id);
    expect(await screen.findByRole('status')).toHaveTextContent('removed');
    expect(screen.queryByText(device.device_name)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });
});
