// @vitest-environment node
import { randomBytes } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Webhook } from 'standardwebhooks';
import { authMessages, enqueueAuthHook } from './emailAuth';
import {
  renderEmail,
  encryptPayload,
  decryptPayload,
  signPreview,
  readPreview,
} from './emailPolicy';
import { recipientList, scheduledInstant } from '../../shared/email';
import { classifyMailError, mailTransport } from './emailTransport';
import { validateAttachment, attachmentName } from './emailAttachments';
afterEach(() => vi.unstubAllEnvs());
describe('Email content and transport boundaries', () => {
  it('provides light defaults, dark overrides and matching footer/link colors in a complete email document', () => {
    const mail = renderEmail('Theme test', '<p>Hello <a href="https://olio.one">Olio</a></p>', 'a@example.com');
    expect(mail.html).toMatch(/^<!doctype html>/);
    expect(mail.html).toContain('<meta name="color-scheme" content="light dark">');
    expect(mail.html).toContain('<meta name="supported-color-schemes" content="light dark">');
    const documentBody = mail.html.slice(mail.html.indexOf('<body'));
    expect(documentBody).toContain('background:#f4f6fb');
    expect(documentBody).toContain('background:#ffffff');
    expect(documentBody).not.toContain('background:#0b1020');
    expect(mail.html).toContain('@media (prefers-color-scheme:dark)');
    expect(mail.html).toContain('.olio-email-panel{background:#111a2e!important;border-color:#283650!important;}');
    expect(mail.html).toContain('.olio-email-content a{color:#93c5fd!important;}');
    expect(mail.html).toContain('[data-ogsc] .olio-email-footer,[data-ogsb] .olio-email-footer');
    expect(mail.text).toBe('Hello Olio (https://olio.one)\n\nThis message was sent to a@example.com by Olio.\nReplies to this email are not monitored.');
  });
  it('normalizes and deduplicates addresses without accepting headers or display names', () => {
    expect(recipientList([' A@Example.com ', 'a@example.com'])).toEqual([
      'a@example.com',
    ]);
    for (const value of [
      'a@example.com\r\nBcc:x@example.com',
      'Display <a@example.com>',
      'a@example.com,b@example.com',
    ])
      expect(() => recipientList([value])).toThrow();
    expect(() =>
      recipientList(
        Array.from({ length: 51 }, (_, i) => `person${i}@example.com`),
      ),
    ).toThrow();
  });
  it('strips executable markup, trackers and unsafe links while keeping formatting', () => {
    const mail = renderEmail(
      'Hello',
      '<p onclick="alert(1)"><strong>Hello</strong><img src="https://track.test"><script>secret()</script><a href="javascript:alert(1)">bad</a><a href="https://example.com">good</a></p>',
    );
    expect(mail.html).toContain('<strong>Hello</strong>');
    expect(mail.html).not.toMatch(/onclick|javascript|<script|<img|secret/);
    expect(mail.text).toContain('Replies to this email are not monitored.');
    expect(mail.text).toContain('https://example.com');
    expect(() =>
      renderEmail('Subject\r\nBcc:person@example.com', 'text'),
    ).toThrow();
    expect(() => renderEmail('Subject', 'a'.repeat(102401))).toThrow();
  });
  it('rejects daylight-saving gaps and requires a choice for overlaps', () => {
    expect(() =>
      scheduledInstant('2026-03-08T02:30', 'America/Indiana/Indianapolis'),
    ).toThrow('does not exist');
    expect(() =>
      scheduledInstant('2026-11-01T01:30', 'America/Indiana/Indianapolis'),
    ).toThrow('occurs twice');
    expect(
      scheduledInstant(
        '2026-11-01T01:30',
        'America/Indiana/Indianapolis',
        'earlier',
      ),
    ).toBe('2026-11-01T05:30:00Z');
    expect(
      scheduledInstant(
        '2026-11-01T01:30',
        'America/Indiana/Indianapolis',
        'later',
      ),
    ).toBe('2026-11-01T06:30:00Z');
  });
  it('authenticates encrypted token payloads and signed previews', () => {
    vi.stubEnv(
      'EMAIL_PAYLOAD_ENCRYPTION_KEY',
      randomBytes(32).toString('base64'),
    );
    vi.stubEnv('ADMIN_OPERATION_SECRET', 'test-secret');
    const encrypted = encryptPayload({ token: 'secret-token' });
    expect(encrypted).not.toContain('secret-token');
    expect(decryptPayload(encrypted)).toEqual({ token: 'secret-token' });
    const modified = Buffer.from(encrypted, 'base64');
    modified[modified.length - 1] ^= 1;
    expect(() => decryptPayload(modified.toString('base64'))).toThrow();
    const token = signPreview({ actor: 'a', revision: 1 });
    expect(readPreview(token).revision).toBe(1);
    expect(() => readPreview(token + 'x')).toThrow();
  });
  it('never blindly retries a possible DATA acceptance and redacts raw SMTP errors', () => {
    expect(classifyMailError({ code: 'ETIMEDOUT', command: 'DATA' })).toEqual({
      status: 'unknown',
      code: 'SMTP_OUTCOME_UNKNOWN',
    });
    expect(classifyMailError({ responseCode: 450 })).toEqual({
      status: 'retry',
      code: 'SMTP_TEMPORARY',
    });
    expect(classifyMailError({ responseCode: 550 })).toEqual({
      status: 'failed',
      code: 'SMTP_REJECTED',
    });
    expect(classifyMailError({ code: 'EAUTH' })).toEqual({
      status: 'retry',
      code: 'SMTP_CONFIGURATION',
      pause: true,
    });
  });
  it('requires fixed sender, TLS port and verified certificates with file/URL access disabled', () => {
    vi.stubEnv('SMTP_EMAIL', 'noreply@olio.one');
    vi.stubEnv('SMTP_PASSWORD', 'test-only');
    const transport = mailTransport();
    expect(transport.options).toMatchObject({
      port: 465,
      secure: true,
      disableFileAccess: true,
      disableUrlAccess: true,
      tls: { rejectUnauthorized: true },
    });
    transport.close();
    vi.stubEnv('SMTP_PORT', '25');
    expect(() => mailTransport()).toThrow('SMTP_CONFIGURATION');
  });
  it('rejects spoofed attachments, unsafe extensions and active text', async () => {
    expect(() => attachmentName('../x.pdf')).toThrow();
    expect(() => attachmentName('x.svg')).toThrow();
    expect(() => attachmentName('x.docm')).toThrow();
    await expect(
      validateAttachment(
        Buffer.from('MZ fake document'),
        'document.pdf',
        'application/pdf',
      ),
    ).rejects.toThrow();
    await expect(
      validateAttachment(
        Buffer.from('<html>active</html>'),
        'document.txt',
        'text/plain',
      ),
    ).rejects.toThrow();
    await expect(
      validateAttachment(
        Buffer.from('PK fake zip'),
        'document.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ).rejects.toThrow();
    await expect(
      validateAttachment(
        Buffer.from('Safe text'),
        'document.txt',
        'text/plain',
      ),
    ).resolves.toMatch(/^[0-9a-f]{64}$/);
  });
});
describe('Supabase email hook', () => {
  it('maps current-address hash_new and new-address hash correctly', () => {
    const messages = authMessages({
      user: { email: 'old@example.com', new_email: 'new@example.com' },
      email_data: {
        email_action_type: 'email_change',
        token_hash: 'new-address-token-hash',
        token_hash_new: 'old-address-token-hash',
      },
    });
    expect(
      messages.find((mail) => mail.recipient === 'old@example.com')?.html,
    ).toContain('old-address-token-hash');
    expect(
      messages.find((mail) => mail.recipient === 'new@example.com')?.html,
    ).toContain('new-address-token-hash');
  });
  it('sends only to the new address when secure email change is disabled', () => {
    expect(
      authMessages({
        user: { email: 'old@example.com', new_email: 'new@example.com' },
        email_data: {
          email_action_type: 'email_change',
          token_hash: 'new-address-token-hash',
        },
      }),
    ).toHaveLength(1);
  });
  it('verifies the exact signed body and durably enqueues encrypted content', async () => {
    const secret = randomBytes(32).toString('base64');
    vi.stubEnv('SEND_EMAIL_HOOK_SECRET', `v1,whsec_${secret}`);
    vi.stubEnv(
      'EMAIL_PAYLOAD_ENCRYPTION_KEY',
      randomBytes(32).toString('base64'),
    );
    const raw = JSON.stringify({
        user: { email: 'a@example.com' },
        email_data: {
          email_action_type: 'recovery',
          token_hash: 'private-token-hash',
        },
      }),
      date = new Date(),
      id = 'hook-event';
    const headers = {
      'webhook-id': id,
      'webhook-timestamp': Math.floor(date.getTime() / 1000).toString(),
      'webhook-signature': new Webhook(secret).sign(id, date, raw),
    };
    const rpc = vi.fn().mockResolvedValue({ error: null });
    await enqueueAuthHook({ rpc } as never, raw, headers);
    expect(rpc).toHaveBeenCalledOnce();
    expect(JSON.stringify(rpc.mock.calls)).not.toContain('private-token-hash');
    await expect(
      enqueueAuthHook({ rpc } as never, raw + ' ', headers),
    ).rejects.toThrow();
    rpc.mockResolvedValue({ error: { message: 'storage failed' } });
    await expect(
      enqueueAuthHook({ rpc } as never, raw, headers),
    ).rejects.toThrow('could not be queued');
    const stale = new Date(Date.now() - 600000);
    await expect(
      enqueueAuthHook({ rpc } as never, raw, {
        ...headers,
        'webhook-timestamp': Math.floor(stale.getTime() / 1000).toString(),
        'webhook-signature': new Webhook(secret).sign(id, stale, raw),
      }),
    ).rejects.toThrow();
  });
});
