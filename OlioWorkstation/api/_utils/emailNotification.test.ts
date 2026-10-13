// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { notificationMail } from './emailNotification';
afterEach(() => vi.unstubAllEnvs());
function service(owner: boolean, data: Record<string, unknown>) {
  let reads = 0;
  const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn(async () => ({ error: null, data: reads++ === 0 ? { app_owner: owner } : data })) };
  return { from: vi.fn(() => chain), rpc: vi.fn(async () => ({ data: false, error: null })) };
}
it('includes escaped signup details and a direct account link in HTML and text', async () => {
  vi.stubEnv('APP_ORIGIN', 'https://olio.one');
  const db = service(true, { display_name: '<img src=x onerror=alert(1)>', email: 'new@example.com' });
  const mail = await notificationMail(db as never, { owner_id: 'owner', event_type: 'signup', event_target: 'target', payload: { subject: 'New signup' } });
  expect(mail.html).not.toContain('<img');
  expect(mail.html).toContain('new@example.com');
  expect(mail.html).toContain('account=target');
  expect(mail.text).toContain('https://olio.one/admin?section=people&account=target');
});
it('omits personal details when the recipient cannot read accounts', async () => {
  const db = service(false, { email: 'hidden@example.com' });
  const mail = await notificationMail(db as never, { owner_id: 'admin', event_type: 'signup', event_target: 'target', payload: { subject: 'New signup' } });
  expect(mail.html).not.toContain('hidden@example.com');
  expect(db.from).toHaveBeenCalledTimes(1);
});
it('links a failed delivery to its specific job and includes its error', async () => {
  const db = service(true, { recipient: 'test@example.com', status: 'failed', error_code: 'SMTP_REJECTED' });
  const mail = await notificationMail(db as never, { owner_id: 'owner', event_type: 'failure', event_target: 'job-id', payload: { subject: 'Email needs attention' } });
  expect(mail.html).toContain('SMTP_REJECTED');
  expect(mail.html).toContain('emailJob=job-id');
});
