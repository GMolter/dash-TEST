import { Webhook } from 'standardwebhooks';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  appOrigin,
  encryptPayload,
  renderEmail,
  digest,
} from './emailPolicy.js';
import { normalizeEmail } from '../../shared/email.js';
type HookBody = {
  user: { email: string; new_email?: string };
  email_data: {
    email_action_type: string;
    token_hash: string;
    token_hash_new?: string;
  };
};
export function authMessages(body: HookBody) {
  const type = body.email_data?.email_action_type;
  if (!['signup', 'recovery', 'email_change', 'invite'].includes(type))
    throw new Error('Unsupported authentication email.');
  const targets =
    type === 'email_change'
      ? [
          { email: body.user.new_email, hash: body.email_data.token_hash },
          ...(body.email_data.token_hash_new
            ? [{ email: body.user.email, hash: body.email_data.token_hash_new }]
            : []),
        ]
      : [{ email: body.user.email, hash: body.email_data.token_hash }];
  return targets.map((target) => {
    if (!target.hash || !/^[a-zA-Z0-9_-]{16,512}$/.test(target.hash))
      throw new Error('Invalid authentication token.');
    // Fragment credentials stay out of HTTP requests and referrers. The page requires a click to verify.
    const url = `${appOrigin()}/auth/confirm#${new URLSearchParams({ token_hash: target.hash, type }).toString()}`;
    const subject =
      type === 'recovery'
        ? 'Reset your Olio password'
        : type === 'email_change'
          ? 'Confirm your Olio email change'
          : 'Confirm your Olio account';
    return {
      recipient: normalizeEmail(target.email),
      ...renderEmail(
        subject,
        `<p><a href="${url.replace(/&/g, '&amp;')}">${subject}</a></p><p>Open the link, then confirm to continue. If you did not request this, ignore this email.</p>`,
      ),
    };
  });
}
export async function enqueueAuthHook(
  service: SupabaseClient,
  raw: string,
  headers: Record<string, string>,
) {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET?.replace(/^v1,whsec_/, '');
  if (!secret) throw new Error('Email hook is not configured.');
  const body = new Webhook(secret).verify(raw, headers) as HookBody;
  const eventId = headers['webhook-id'];
  if (!eventId || eventId.length > 200)
    throw new Error('Invalid hook identifier.');
  // Configure this no higher than the Supabase email OTP/token expiry. Age from the signed timestamp.
  const lifetime = Math.min(
    3600,
    Math.max(60, Number(process.env.EMAIL_AUTH_TTL_SECONDS || 600)),
  );
  const expires = new Date(
    (Number(headers['webhook-timestamp']) + lifetime) * 1000,
  ).toISOString();
  const jobs = authMessages(body).map((mail) => ({
    recipient: mail.recipient,
    encrypted_payload: encryptPayload(mail),
    dedupe_key: `auth:${digest(eventId)}:${digest(mail.recipient)}`,
    expires_at: expires,
  }));
  const { error } = await service.rpc('email_auth_enqueue', { p_jobs: jobs });
  if (error) throw new Error('Authentication email could not be queued.');
}
