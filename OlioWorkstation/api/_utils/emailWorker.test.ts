// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ send: vi.fn(), close: vi.fn() }));
vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({ sendMail: mocks.send, close: mocks.close }),
  },
}));
import { dispatchEmail } from './emailWorker';
import { personalizedEmail } from './emailPersonalization';
it.each(['accepted', 'revoked', 'retry'])('handles support delivery outcome %s without changing ticket data', async outcome => {
  vi.stubEnv('SMTP_EMAIL', 'noreply@olio.one');
  vi.stubEnv('SMTP_PASSWORD', 'test-only');
  vi.stubEnv('EMAIL_DELIVERY_ENABLED', 'true');
  if (outcome === 'retry') mocks.send.mockRejectedValue({ code: 'ECONNECTION' });
  else mocks.send.mockResolvedValue({ accepted: ['user@example.com'] });
  let claims = 0;
  const rpc = vi.fn(async (name: string) => ({ error: null, data: name === 'email_worker_lock' ? true : name === 'support_email_allowed' ? outcome !== 'revoked' : name === 'email_claim' && claims++ === 0 ? [{ id: 'job', kind: 'transactional', owner_id: 'user', recipient: 'user@example.com', event_type: 'support_user', event_target: 'event', payload: { subject: 'Support ticket #12: new reply' }, lease_token: 'lease' }] : null }));
  const chain = { eq: vi.fn().mockReturnThis(), lt: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }), maybeSingle: vi.fn().mockResolvedValue({ data: { app_owner: false, ticket_id: 'ticket', kind: 'reply' }, error: null }) };
  const from = vi.fn(() => chain);
  await dispatchEmail({ rpc, from } as never);
  expect(rpc).toHaveBeenCalledWith('support_email_allowed', { p_user: 'user', p_event: 'event', p_recipient: 'user@example.com', p_admin: false });
  expect(rpc).toHaveBeenCalledWith('email_finish', expect.objectContaining({ p_status: outcome === 'revoked' ? 'cancelled' : outcome }));
  if (outcome === 'revoked') expect(mocks.send).not.toHaveBeenCalled();
  else expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining('/support?ticket=ticket') }));
  expect(from).not.toHaveBeenCalledWith('support_tickets');
});
it('sends the exact personalized preview from frozen queue values', async () => {
  vi.stubEnv('SMTP_EMAIL', 'noreply@olio.one');
  vi.stubEnv('SMTP_PASSWORD', 'test-only');
  vi.stubEnv('EMAIL_DELIVERY_ENABLED', 'true');
  const variables = { firstname: 'Avery', fullname: 'Avery Stone' };
  const message = { subject: 'Hello {{firstname}}', html: '<p>Hi {{fullname}}</p>', attachment_ids: [] };
  mocks.send.mockResolvedValue({ accepted: ['a@example.com'] });
  let claims = 0;
  const rpc = vi.fn(async (name: string) => ({ error: null, data: name === 'email_worker_lock' || name === 'admin_has_permission' ? true : name === 'email_claim' && claims++ === 0 ? [{ id: 'personal-job', kind: 'manual', recipient: 'a@example.com', owner_id: 'owner', message_id: 'message', lease_token: 'lease', payload: { presentation: 'olio-v1', variables } }] : null }));
  const chain = { eq: vi.fn().mockReturnThis(), lt: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }), single: vi.fn().mockResolvedValue({ data: message, error: null }) };
  const from = vi.fn(() => chain);
  await dispatchEmail({ rpc, from } as never);
  expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining(personalizedEmail(message.subject, message.html, 'a@example.com', variables)));
  expect(from).not.toHaveBeenCalledWith('profiles');
});
it.each(['manual', 'notification'])('applies the test allowlist only to automatic mail: %s', async kind => {
  vi.stubEnv('SMTP_EMAIL', 'noreply@olio.one');
  vi.stubEnv('SMTP_PASSWORD', 'test-only');
  vi.stubEnv('EMAIL_DELIVERY_ENABLED', 'true');
  vi.stubEnv('EMAIL_TEST_RECIPIENT_ALLOWLIST', 'allowed@example.com');
  mocks.send.mockResolvedValue({ accepted: ['external@example.com'] });
  let claims = 0;
  const rpc = vi.fn(async (name: string) => ({ error: null, data:
    name === 'email_worker_lock' || name === 'admin_has_permission' ? true :
    name === 'email_claim' && claims++ === 0 ? [{ id: 'job', kind, recipient: 'external@example.com', owner_id: 'owner', message_id: 'message', lease_token: 'lease', payload: {} }] : null }));
  const chain = { eq: vi.fn().mockReturnThis(), lt: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }), single: vi.fn().mockResolvedValue({ data: { subject: 'Hello', html: '<p>Hello</p>', plain_text: 'Hello', attachment_ids: [] }, error: null }) };
  await dispatchEmail({ rpc, from: vi.fn(() => chain) } as never);
  if (kind === 'manual') {
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'external@example.com' }));
    expect(rpc).toHaveBeenCalledWith('admin_has_permission', expect.objectContaining({ p_key: 'email.send' }));
  } else expect(mocks.send).not.toHaveBeenCalled();
  expect(rpc).toHaveBeenCalledWith('email_finish', expect.objectContaining({ p_status: kind === 'manual' ? 'accepted' : 'cancelled', p_error: kind === 'manual' ? null : 'TEST_ALLOWLIST' }));
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
it('sends one recipient with fixed identity and records acceptance rather than delivery', async () => {
  vi.stubEnv('SMTP_EMAIL', 'noreply@olio.one');
  vi.stubEnv('SMTP_PASSWORD', 'test-only');
  vi.stubEnv('EMAIL_DELIVERY_ENABLED', 'true');
  mocks.send.mockResolvedValue({ accepted: ['a@example.com'] });
  let claims = 0;
  const rpc = vi.fn(async (name: string) => ({
    error: null,
    data:
      name === 'email_worker_lock'
        ? true
        : name === 'email_claim'
          ? claims++ === 0
            ? [
                {
                  id: 'job',
                  recipient: 'a@example.com',
                  kind: 'notification',
                  lease_token: 'lease',
                  payload: {
                    subject: 'Notice',
                    html: '<p>Notice</p>',
                    text: 'Notice',
                  },
                },
              ]
            : []
          : null,
  }));
  const chain = {
    eq: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  };
  const service = { rpc, from: vi.fn(() => chain) };
  await dispatchEmail(service as never);
  expect(mocks.send).toHaveBeenCalledWith(
    expect.objectContaining({
      from: { name: 'Olio', address: 'noreply@olio.one' },
      to: 'a@example.com',
      messageId: '<job@olio.one>',
      disableFileAccess: true,
      disableUrlAccess: true,
    }),
  );
  const sent = mocks.send.mock.calls[0][0];
  expect(sent).not.toHaveProperty('cc');
  expect(sent).not.toHaveProperty('replyTo');
  expect(rpc).toHaveBeenCalledWith(
    'email_finish',
    expect.objectContaining({ p_status: 'accepted', p_error: null }),
  );
});
