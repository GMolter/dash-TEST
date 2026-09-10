import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), updateUser: vi.fn(), allowed: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser: mocks.getUser, admin: { updateUserById: mocks.updateUser } } }) }));
vi.mock('../api/_utils/accountAccess.js', () => ({ accountIsAllowed: mocks.allowed }));
vi.mock('../api/_utils/supabaseConfig.js', () => ({ getSupabaseServiceConfig: () => ({ ok: true, url: 'http://localhost', serviceKey: 'test-only' }) }));
import handler from '../api/auth/complete-password-reset';
async function request(password = 'new-password-123') {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  await handler({ method: 'POST', headers: { authorization: 'Bearer test-token' }, body: { password } }, res);
  return res;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.allowed.mockResolvedValue(true);
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1', app_metadata: { force_password_change: true, other_flag: true } } }, error: null });
  mocks.updateUser.mockResolvedValue({ error: null });
});
describe('Password completion API', () => {
  it('saves the password and clears the flag in the same update', async () => {
    const res = await request();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mocks.updateUser).toHaveBeenCalledWith('user-1', { password: 'new-password-123', app_metadata: { force_password_change: false, other_flag: true } });
  });
  it('acknowledges a retry after completion without changing the password again', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1', app_metadata: { force_password_change: false } } }, error: null });
    const res = await request();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, alreadyCompleted: true });
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it('rejects suspended accounts even on a retry', async () => {
    mocks.allowed.mockResolvedValue(false);
    const res = await request();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it('rejects short passwords before changing the account', async () => {
    const res = await request('short');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
});
