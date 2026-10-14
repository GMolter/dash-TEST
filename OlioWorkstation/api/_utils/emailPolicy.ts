import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import sanitizeHtml from './emailSanitizer.generated.cjs';
import { recipientList, scheduledInstant } from '../../shared/email.js';
export { recipientList, scheduledInstant };
export function sanitizeEmailContent(subject: unknown, body: unknown) {
  if (
    typeof subject !== 'string' ||
    !subject.trim() ||
    subject.length > 200 ||
    [...subject].some(character => character.charCodeAt(0) < 32)
  )
    throw new Error(
      'Subject must contain 1–200 characters without line breaks.',
    );
  if (typeof body !== 'string' || Buffer.byteLength(body) > 102400)
    throw new Error('Message is too large (100 KB maximum).');
  const html = sanitizeHtml(body, {
    allowedTags: ['p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'a'],
    allowedAttributes: { a: ['href'] },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  });
  const text = sanitizeHtml(
    html
      .replace(/<a\b[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gis, '$2 ($1)')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/(p|li)>/gi, '\n'),
    { allowedTags: [], allowedAttributes: {} },
  )
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
  if (!text) throw new Error('Write a message before continuing.');
  return { subject: subject.trim(), html, text };
}
export const escapeEmailText = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
export function renderEmail(subject: unknown, body: unknown, recipient?: string) {
  const content = sanitizeEmailContent(subject, body);
  const sentTo = recipient ? `This message was sent to ${recipient} by Olio.` : 'This message was sent by Olio.';
  const footer = 'Replies to this email are not monitored.';
  // Inline styles and a presentation table survive common email clients. No remote images are needed.
  const html = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b1020;color:#e2e8f0;font-family:Arial,Helvetica,sans-serif;"><tr><td style="padding:32px 16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:0 auto;background:#111a2e;border:1px solid #283650;border-radius:16px;"><tr><td style="padding:28px 28px 20px;border-bottom:1px solid #283650;"><span style="font-size:28px;font-weight:700;letter-spacing:-1px;color:#bfdbfe;">Olio<span style="color:#a78bfa;">.</span></span></td></tr><tr><td style="padding:24px 28px;font-size:16px;line-height:1.7;color:#e2e8f0;overflow-wrap:anywhere;">${content.html.replace(/<a /g, '<a style="color:#93c5fd;text-decoration:underline;" ')}</td></tr><tr><td style="padding:8px 28px 28px;"><div style="border-top:1px solid #64748b;padding-top:20px;font-family:Consolas,Menlo,monospace;font-size:12px;line-height:1.8;color:#cbd5e1;">${escapeEmailText(sentTo)}<br>${footer}</div></td></tr></table></td></tr></table>`;
  return { subject: content.subject, html, text: `${content.text}\n\n${sentTo}\n${footer}` };
}
export { appOrigin } from './appOrigin.js';
export const digest = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function secretMatches(actual: string, expected: string | undefined) {
  return (
    !!expected &&
    actual.length === expected.length &&
    timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  );
}
export function signPreview(value: Record<string, unknown>) {
  const secret = process.env.ADMIN_OPERATION_SECRET;
  if (!secret) throw new Error('Email confirmation is not configured.');
  const payload = Buffer.from(
    JSON.stringify({ ...value, expires: Date.now() + 300000 }),
  ).toString('base64url');
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
}
export function readPreview(token: unknown): {
  actor: string; draft: string; revision: number; fingerprint: string; expires: number;
  snapshot: { subject: string; html: string; text: string; recipients: string[]; scheduled_at: string; timezone: string; presentation?: string; personalization?: Record<string, Record<string, string> | null> };
} {
  if (typeof token !== 'string') throw new Error('Review the message again.');
  const [payload, signature, extra] = token.split('.');
  const secret = process.env.ADMIN_OPERATION_SECRET;
  if (
    !secret ||
    extra ||
    !payload ||
    !secretMatches(
      signature || '',
      createHmac('sha256', secret).update(payload).digest('base64url'),
    )
  )
    throw new Error('Review the message again.');
  const value = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (value.expires < Date.now())
    throw new Error('Preview expired. Review the message again.');
  return value;
}
function encryptionKey() {
  const key = Buffer.from(
    process.env.EMAIL_PAYLOAD_ENCRYPTION_KEY || '',
    'base64',
  );
  if (key.length !== 32)
    throw new Error('Authentication email encryption is not configured.');
  return key;
}
export function encryptPayload(value: unknown) {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value)),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}
export function decryptPayload(value: string) {
  const bytes = Buffer.from(value, 'base64');
  const cipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    bytes.subarray(0, 12),
  );
  cipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([
      cipher.update(bytes.subarray(28)),
      cipher.final(),
    ]).toString(),
  );
}
