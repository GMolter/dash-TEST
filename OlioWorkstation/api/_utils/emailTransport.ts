import nodemailer from 'nodemailer';
export type MailFailure = {
  status: 'retry' | 'failed' | 'unknown';
  code: string;
  pause?: boolean;
};
export function classifyMailError(error: {
  code?: string;
  command?: string;
  responseCode?: number;
}): MailFailure {
  if (error.code === 'EAUTH' || error.responseCode === 535)
    return { status: 'retry', code: 'SMTP_CONFIGURATION', pause: true };
  // DATA timeouts may occur after acceptance. Only explicit negative responses are safe to retry.
  if (error.responseCode && error.responseCode >= 500)
    return { status: 'failed', code: 'SMTP_REJECTED' };
  if (error.responseCode && error.responseCode >= 400)
    return { status: 'retry', code: 'SMTP_TEMPORARY' };
  if (
    ['CONN', 'EHLO', 'HELO', 'AUTH', 'MAIL FROM', 'RCPT TO'].includes(
      error.command || '',
    ) ||
    ['EDNS', 'ECONNECTION'].includes(error.code || '')
  )
    return { status: 'retry', code: 'SMTP_CONNECTION' };
  return { status: 'unknown', code: 'SMTP_OUTCOME_UNKNOWN' };
}
export function mailTransport() {
  if (
    !process.env.SMTP_PASSWORD ||
    process.env.SMTP_EMAIL !== 'noreply@olio.one' ||
    (process.env.SMTP_PORT && process.env.SMTP_PORT !== '465') ||
    (process.env.SMTP_HOST && process.env.SMTP_HOST !== 'smtp.stackmail.com')
  )
    throw new Error('SMTP_CONFIGURATION');
  return nodemailer.createTransport({
    host: 'smtp.stackmail.com',
    port: 465,
    secure: true,
    auth: { user: 'noreply@olio.one', pass: process.env.SMTP_PASSWORD },
    tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
  });
}
export function deliveryEnabled(auth = false) {
  return (
    process.env[
      auth ? 'EMAIL_AUTH_DELIVERY_ENABLED' : 'EMAIL_DELIVERY_ENABLED'
    ] === 'true'
  );
}
export function allowedTestRecipient(email: string) {
  const allowlist = (process.env.EMAIL_TEST_RECIPIENT_ALLOWLIST || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return !allowlist.length || allowlist.includes(email.toLowerCase());
}
