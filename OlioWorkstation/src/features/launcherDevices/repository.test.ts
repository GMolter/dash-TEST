import { describe, expect, it, vi } from 'vitest';
import { createLauncherDeviceRepository, LauncherDeviceDataError } from './repository';

describe('launcher device repository', () => {
  it('uses safe owner-derived RPCs without client ownership values', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: true, error: null });
    const repository = createLauncherDeviceRepository({ rpc } as never);
    await expect(repository.list()).resolves.toEqual([]);
    await expect(repository.revoke('device-row')).resolves.toBeUndefined();
    expect(rpc).toHaveBeenNthCalledWith(1, 'list_launcher_devices');
    expect(rpc).toHaveBeenNthCalledWith(2, 'revoke_launcher_device', { p_device_id: 'device-row' });
    expect(JSON.stringify(rpc.mock.calls)).not.toContain('user_id');
    expect(JSON.stringify(rpc.mock.calls)).not.toContain('owner_id');
  });

  it('converts backend detail into a content-free error', async () => {
    const repository = createLauncherDeviceRepository({ rpc: vi.fn(async () => ({ data: null, error: { message: 'sensitive backend detail' } })) } as never);
    await expect(repository.list()).rejects.toBeInstanceOf(LauncherDeviceDataError);
  });
});

