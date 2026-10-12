import { Temporal } from '@js-temporal/polyfill';

export const emailEvents = [
  'signup',
  'organization',
  'review',
  'failure',
] as const;
export type EmailEvent = (typeof emailEvents)[number];
export const deliveryLabels: Record<string, string> = {
  queued: 'Queued',
  scheduled: 'Scheduled',
  sending: 'Sending',
  accepted: 'Accepted by mail server',
  retry: 'Retry pending',
  failed: 'Failed',
  unknown: 'Outcome unknown',
  cancelled: 'Cancelled',
  expired: 'Expired',
};
export type EmailContent = { subject: string; html: string };
export type EmailDraft = EmailContent & {
  id: string;
  revision: number;
  recipients: string[];
  attachment_ids: string[];
};
export function normalizeEmail(input: unknown): string {
  if (typeof input !== 'string')
    throw new Error('Enter a valid email address.');
  const value = input.trim().toLowerCase();
  if (
    value.length > 254 ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(
      value,
    )
  )
    throw new Error('Enter a valid email address.');
  return value;
}
export function recipientList(values: unknown): string[] {
  if (!Array.isArray(values) || values.length > 500)
    throw new Error('Choose at most 50 recipients.');
  const recipients = [...new Set(values.map(normalizeEmail))].sort();
  if (!recipients.length || recipients.length > 50)
    throw new Error('Choose 1–50 unique recipients.');
  return recipients;
}
// Reject DST gaps and require an explicit choice for repeated wall-clock times.
export function scheduledInstant(
  local: string,
  timezone: string,
  choice: 'reject' | 'earlier' | 'later' = 'reject',
): string {
  const plain = Temporal.PlainDateTime.from(local);
  const early = plain.toZonedDateTime(timezone, { disambiguation: 'earlier' });
  const late = plain.toZonedDateTime(timezone, { disambiguation: 'later' });
  if (
    !early.toPlainDateTime().equals(plain) ||
    !late.toPlainDateTime().equals(plain)
  )
    throw new Error('This local time does not exist. Choose another time.');
  if (early.epochMilliseconds !== late.epochMilliseconds && choice === 'reject')
    throw new Error(
      'This time occurs twice. Choose the earlier or later occurrence.',
    );
  return (choice === 'later' ? late : early).toInstant().toString();
}
