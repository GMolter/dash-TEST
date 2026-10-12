import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServiceConfig } from './_utils/supabaseConfig.js';
import { requireAdminAccess } from './_utils/adminAccess.js';
import { appOrigin, digest, secretMatches } from './_utils/emailPolicy.js';
import { normalizeEmail } from '../shared/email.js';
import { enqueueAuthHook } from './_utils/emailAuth.js';
import { dispatchEmail } from './_utils/emailWorker.js';
import { emailAdmin } from './_utils/emailAdmin.js';
export const config = { runtime: 'nodejs', maxDuration: 60 };
async function rawBody(req: VercelRequest, limit: number) {
  // Vercel restores the original bytes on data/end events; req.body is a lazy JSON
  // parser and must never be read before verifying a webhook signature.
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let length = 0;
    req.on('data', (chunk: Buffer) => {
      length += chunk.length;
      if (length > limit) reject(new Error('Request too large.'));
      else chunks.push(Buffer.from(chunk));
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });
  const action = typeof req.query.action === 'string' ? req.query.action : '';
  const cfg = getSupabaseServiceConfig();
  if (!cfg.ok)
    return res.status(503).json({ error: 'Email service unavailable.' });
  const service = createClient(cfg.url, cfg.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    if (action === 'dispatch') {
      if (
        !secretMatches(
          String(req.headers.authorization || ''),
          process.env.EMAIL_DISPATCH_SECRET
            ? `Bearer ${process.env.EMAIL_DISPATCH_SECRET}`
            : undefined,
        )
      )
        return res.status(401).json({ error: 'Unauthorized' });
      return res.status(200).json(await dispatchEmail(service));
    }
    if (action === 'hook') {
      // Never reconstruct a parsed object for signature verification.
      const raw = await rawBody(req, 65536);
      await enqueueAuthHook(
        service,
        raw,
        Object.fromEntries(
          ['webhook-id', 'webhook-timestamp', 'webhook-signature'].map(
            (key) => [key, String(req.headers[key] || '')],
          ),
        ),
      );
      return res.status(200).json({});
    }
    if (action === 'recovery' || action === 'resend') {
      const input = JSON.parse(await rawBody(req, 4096));
      const generic = {
        ok: true,
        message:
          'If eligible, a link will be emailed shortly. Check your inbox and spam folder. You can try again in one minute.',
      };
      let email: string;
      try {
        email = normalizeEmail(input.email);
      } catch {
        return res.status(200).json(generic);
      }
      const ip = String(
        req.headers['x-vercel-forwarded-for'] ||
          req.headers['x-forwarded-for'] ||
          req.socket?.remoteAddress ||
          'unknown',
      ).split(',')[0];
      const ipLimit = await service.rpc('email_cooldown', {
        p_key: `ip:${digest(ip)}`,
        p_seconds: 10,
      });
      if (ipLimit.error)
        return res
          .status(503)
          .json({ error: 'Email requests are temporarily unavailable.' });
      if (!ipLimit.data) return res.status(200).json(generic);
      const limit = await service.rpc('email_cooldown', {
        p_key: `account:${digest(email)}`,
        p_seconds: 60,
      });
      if (limit.error)
        return res
          .status(503)
          .json({ error: 'Email requests are temporarily unavailable.' });
      if (limit.data) {
        // The auth provider and hook handle durable delivery; do not expose account existence or provider errors.
        if (action === 'recovery')
          await service.auth.resetPasswordForEmail(email, {
            redirectTo: `${appOrigin()}/auth/reset-password`,
          });
        else
          await service.auth.resend({
            type: 'signup',
            email,
            options: { emailRedirectTo: `${appOrigin()}/auth/confirm` },
          });
      }
      return res.status(200).json(generic);
    }
    const access = await requireAdminAccess(req);
    if (access.ok === false)
      return res.status(access.status).json({ error: access.error });
    const input = JSON.parse((await rawBody(req, 524288)) || '{}');
    if (!input || Array.isArray(input) || typeof input !== 'object')
      throw new Error('Invalid payload.');
    return res
      .status(200)
      .json(await emailAdmin(service, access, action, input));
  } catch (error) {
    if (action === 'hook')
      return res
        .status(400)
        .json({
          error: {
            http_code: 400,
            message: 'Authentication email could not be queued.',
          },
        });
    if (action === 'dispatch')
      return res
        .status(503)
        .json({ error: 'Email dispatch unavailable. Check delivery health.' });
    const message =
      error instanceof Error ? error.message : 'Email action failed.';
    const allowed =
      /^(PERMISSION_DENIED|DRAFT_CHANGED|IDEMPOTENCY_CONFLICT|HOURLY_LIMIT|DISPATCH_ALREADY_STARTED|CONFIRM_DUPLICATE_RISK|CONTENT_EXPIRED|Enter |Choose |Use |Invalid |Attachment|Attachments|File |Message |Subject |Write |Draft |Review |Preview |Confirm |Email |Upload |This |Could not |Request |Unknown email|Content)/.test(
        message,
      );
    return res
      .status(message === 'PERMISSION_DENIED' ? 403 : 400)
      .json({
        error: allowed ? message : 'Email action failed. Please try again.',
      });
  }
}
