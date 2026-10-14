// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { emailAdmin } from './emailAdmin';
import { readPreview } from './emailPolicy';
import { privateRecordHandle } from './adminRecordHandles';
import type { AdminAccess } from './adminAccess';
const actor = { userId: '11111111-1111-4111-8111-111111111111', appOwner: true, permissions: [] } as unknown as AdminAccess;
const draft = { id: '22222222-2222-4222-8222-222222222222', revision: 1, subject: 'Hello {{firstname}}', html: '<p>Hi {{fullname}}</p>', recipients: ['a@example.com', 'b@example.com'], attachment_ids: [] };
function service(people = [{ email: 'a@example.com', first_name: 'Avery', last_name: 'Stone' }, { email: 'b@example.com', first_name: 'Blair', last_name: 'Reed' }]) {
  const chain = (table: string) => {
    const result = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: table === 'email_drafts' ? draft : { email: 'a@example.com', display_name: 'Avery Stone' }, error: null }),
      in: vi.fn().mockResolvedValue({ data: people, error: null }) };
    return result;
  };
  return { from: vi.fn(chain), rpc: vi.fn().mockResolvedValue({ data: 'message-id', error: null }) };
}
afterEach(() => vi.unstubAllEnvs());
it('freezes all recipient values and previews another person without re-reading their account', async () => {
  vi.stubEnv('ADMIN_OPERATION_SECRET', 'test-secret');
  vi.stubEnv('EMAIL_DELIVERY_ENABLED', 'true');
  const db = service();
  const result = await emailAdmin(db as never, actor, 'preview', { id: draft.id, revision: 1 }) as { token: string; subject: string; html: string };
  expect(result.subject).toBe('Hello Avery');
  const signed = readPreview(result.token);
  expect(signed.snapshot.html).toContain('{{fullname}}');
  expect(signed.snapshot.personalization?.['b@example.com']?.firstname).toBe('Blair');
  db.from.mockClear();
  const second = await emailAdmin(db as never, actor, 'preview-recipient', { token: result.token, recipient: 'b@example.com' });
  expect(second).toMatchObject({ subject: 'Hello Blair' });
  expect(db.from).not.toHaveBeenCalled();
  await expect(emailAdmin(db as never, actor, 'preview-recipient', { token: result.token, recipient: 'other@example.com' })).rejects.toThrow('Choose a recipient');
  await emailAdmin(db as never, actor, 'submit', { token: result.token, key: draft.id, confirmation: 'SEND' });
  expect(db.rpc).toHaveBeenCalledWith('email_submit_personalized', expect.objectContaining({ p_snapshot: signed.snapshot }));
});
it('rejects the entire preview when even one group member is missing required data', async () => {
  const db = service([{ email: 'a@example.com', first_name: 'Avery', last_name: 'Stone' }]);
  await expect(emailAdmin(db as never, actor, 'preview', { id: draft.id, revision: 1 })).rejects.toThrow('b@example.com');
  expect(db.rpc).not.toHaveBeenCalled();
});
it('resolves private contact handles and requires sending access', async () => {
  vi.stubEnv('ADMIN_OPERATION_SECRET', 'test-secret');
  const db = service();
  expect(await emailAdmin(db as never, actor, 'contact-user', { user_id: privateRecordHandle(draft.id) })).toMatchObject({ person: { email: 'a@example.com' } });
  await expect(emailAdmin(db as never, { ...actor, appOwner: false }, 'contact-user', { user_id: draft.id })).rejects.toThrow('PERMISSION_DENIED');
});
