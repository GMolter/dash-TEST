import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccessCheckError, startAccessPolling, type AdminAccessSnapshot } from './accessPolling';
const snapshot: AdminAccessSnapshot = { canAccessAdmin: true, accountStatus: 'active', userId: 'a', appOwner: false, preset: 'custom', permissions: [], accessVersion: 'one' };
afterEach(() => vi.useRealTimers());
describe('silent access verification', () => {
  it('checks every 20 seconds without refreshing unchanged data', async () => {
    vi.useFakeTimers(); const load = vi.fn().mockResolvedValue(snapshot), changed = vi.fn(), health = vi.fn();
    const controller = startAccessPolling({ load, changed, health, denied: vi.fn() });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(load).toHaveBeenCalledTimes(4); expect(changed).toHaveBeenCalledTimes(1);
    load.mockResolvedValue({ ...snapshot, accessVersion: 'two' }); await controller.check(); await controller.check();
    expect(changed).toHaveBeenCalledTimes(2); controller.stop();
  });
  it('skips overlapping checks and ignores responses after session teardown', async () => {
    vi.useFakeTimers(); let resolve!: (value: AdminAccessSnapshot) => void;
    const load = vi.fn((_signal: AbortSignal) => new Promise<AdminAccessSnapshot>(done => { resolve = done; })), changed = vi.fn();
    const controller = startAccessPolling({ load, changed, health: vi.fn(), denied: vi.fn() });
    await vi.advanceTimersByTimeAsync(40_000); await controller.check(); expect(load).toHaveBeenCalledTimes(1);
    controller.stop(); resolve(snapshot); await Promise.resolve(); expect(changed).not.toHaveBeenCalled();
    expect(load.mock.calls[0][0].aborted).toBe(true);
  });
  it('preserves data on transient failures and recovers without remounting', async () => {
    vi.useFakeTimers(); const load = vi.fn().mockResolvedValue(snapshot), changed = vi.fn(), health = vi.fn(), denied = vi.fn();
    const controller = startAccessPolling({ load, changed, health, denied }); await vi.advanceTimersByTimeAsync(0);
    load.mockRejectedValue(new Error('offline')); await controller.check(); expect(health).toHaveBeenLastCalledWith(false); expect(denied).not.toHaveBeenCalled();
    load.mockResolvedValue(snapshot); await controller.check(); expect(changed).toHaveBeenCalledTimes(1); expect(health).toHaveBeenLastCalledWith(true); controller.stop();
  });
  it.each([401, 403, 404])('immediately exits and stops on %s', async status => {
    vi.useFakeTimers(); const load = vi.fn().mockRejectedValue(new AccessCheckError(status)), denied = vi.fn();
    startAccessPolling({ load, denied, changed: vi.fn(), health: vi.fn() }); await vi.advanceTimersByTimeAsync(60_000);
    expect(denied).toHaveBeenCalledTimes(1); expect(load).toHaveBeenCalledTimes(1);
  });
});
