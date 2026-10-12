// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ send: vi.fn(), close: vi.fn() }));
vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({ sendMail: mocks.send, close: mocks.close }),
  },
}));
import { dispatchEmail } from './emailWorker';
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
