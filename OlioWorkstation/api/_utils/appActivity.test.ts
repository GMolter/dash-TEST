import { describe, expect, it, vi } from 'vitest';
import { attachAppActivity } from './appActivity';

const service = (result: unknown) => ({ from: vi.fn(() => ({ select: () => ({ in: async () => result }) })) });
describe('admin app activity', () => {
  it('distinguishes missing setup from an untracked visit and never falls back to login dates', async () => {
    const rows = [{ id: 'u1', last_sign_in_at: '2026-09-20T00:00:00Z' }];
    expect(await attachAppActivity(service({ error: { code: 'PGRST205' } }), rows)).toMatchObject([{ last_active_at: null, _admin_activity_status: 'unavailable' }]);
    expect(await attachAppActivity(service({ data: [] }), rows)).toMatchObject([{ last_active_at: null, _admin_activity_status: 'pending' }]);
  });
  it('matches app visits to the correct account', async () => {
    const result = await attachAppActivity(service({ data: [{ user_id: 'u2', last_active_at: '2026-09-21T12:00:00Z' }] }), [{ id: 'u1' }, { id: 'u2' }]);
    expect(result[0].last_active_at).toBeNull();
    expect(result[1]).toMatchObject({ last_active_at: '2026-09-21T12:00:00Z', _admin_activity_status: 'tracked' });
  });
  it('does not disguise database failures as missing activity', async () => {
    await expect(attachAppActivity(service({ error: { code: '42501' } }), [{ id: 'u1' }])).rejects.toMatchObject({ code: '42501' });
  });
});
