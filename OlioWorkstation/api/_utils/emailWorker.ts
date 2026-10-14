import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptPayload } from './emailPolicy.js';
import { loadAttachments } from './emailAttachments.js';
import { notificationMail } from './emailNotification.js';
import { personalizedEmail } from './emailPersonalization.js';
import {
  allowedTestRecipient,
  classifyMailError,
  deliveryEnabled,
  mailTransport,
} from './emailTransport.js';

export async function dispatchEmail(service: SupabaseClient) {
  console.info('email dispatch', { stage: 'started', manualEnabled: deliveryEnabled(), authEnabled: deliveryEnabled(true) });
  // Expire encrypted auth payloads even if SMTP is paused or delivery is disabled.
  const { error: cleanupError } = await service.rpc('email_cleanup');
  if (cleanupError) throw new Error('Queue maintenance unavailable.');
  const worker = randomUUID(),
    started = Date.now();
  const { data: locked, error: lockError } = await service.rpc(
    'email_worker_lock',
    { p_token: worker },
  );
  if (lockError) throw new Error('Queue unavailable.');
  if (!locked) {
    console.info('email dispatch', { stage: 'paused-or-busy' });
    return { processed: 0, pausedOrBusy: true };
  }
  let processed = 0;
  try {
    const { error } = await service.rpc('email_expand_events');
    if (error) throw new Error('Notification expansion unavailable.');
    for (let i = 0; i < 5 && Date.now() - started < 35000; i++) {
      const { data, error: claimError } = await service.rpc('email_claim', {
        p_worker: worker,
        p_auth: deliveryEnabled(true),
        p_manual: deliveryEnabled(),
        p_hourly: Number(process.env.EMAIL_HOURLY_LIMIT || 100),
      });
      if (claimError) throw new Error('Queue claim failed.');
      const job = data?.[0];
      if (!job) break;
      console.info('email dispatch', { stage: 'claimed', jobId: job.id });
      let outcome: { status: string; code?: string; pause?: boolean } = {
        status: 'failed',
        code: 'CONTENT_UNAVAILABLE',
      };
      let smtpStarted = false;
      try {
        if (job.kind !== 'manual' && !allowedTestRecipient(job.recipient)) {
          outcome = { status: 'cancelled', code: 'TEST_ALLOWLIST' };
        } else {
          const transport = mailTransport();
          let mail =
            job.kind === 'auth'
              ? decryptPayload(job.encrypted_payload)
              : job.payload;
          if (job.kind === 'notification' && job.event_type && job.event_target)
            mail = await notificationMail(service, job);
          let attachments: Awaited<ReturnType<typeof loadAttachments>> = [];
          if (job.kind === 'manual') {
            const { data: message, error: messageError } = await service
              .from('email_messages')
              .select('*')
              .eq('id', job.message_id)
              .single();
            if (messageError || !message.html)
              throw new Error('CONTENT_UNAVAILABLE');
            attachments = await loadAttachments(
              service,
              job.owner_id,
              message.attachment_ids,
            );
            mail = job.payload?.presentation === 'olio-v1' ? personalizedEmail(message.subject, message.html, job.recipient, job.payload.variables) : {
              subject: message.subject,
              html: message.html,
              text: message.plain_text,
            };
            // Last permission check after downloading attachments, immediately before SMTP.
            const { data: allowed, error: permissionError } = await service.rpc(
              'admin_has_permission',
              { p_user: job.owner_id, p_key: 'email.send' },
            );
            if (permissionError) throw new Error('ACCESS_CHECK_UNAVAILABLE');
            if (!allowed) {
              outcome = { status: 'cancelled', code: 'ACCESS_REVOKED' };
              mail = null;
            }
          }
          if (mail) {
            console.info('email dispatch', { stage: 'smtp-started', jobId: job.id });
            smtpStarted = true;
            try {
              const result = await transport.sendMail({
                from: { name: 'Olio', address: 'noreply@olio.one' },
                to: job.recipient,
                subject: mail.subject,
                html: mail.html,
                text: mail.text,
                attachments,
                messageId: `<${job.id}@olio.one>`,
                disableFileAccess: true,
                disableUrlAccess: true,
              });
              outcome = result.accepted.length
                ? { status: 'accepted' }
                : { status: 'failed', code: 'SMTP_REJECTED' };
            } finally {
              transport.close();
            }
          }
        }
      } catch (error) {
        if (smtpStarted)
          outcome = classifyMailError(
            error as { code?: string; command?: string; responseCode?: number },
          );
        else if (
          error instanceof Error &&
          error.message === 'SMTP_CONFIGURATION'
        )
          outcome = {
            status: 'retry',
            code: 'SMTP_CONFIGURATION',
            pause: true,
          };
        else
          outcome = { status: 'failed', code: 'CONTENT_OR_ACCESS_UNAVAILABLE' };
      }
      const { error: finishError } = await service.rpc('email_finish', {
        p_id: job.id,
        p_lease: job.lease_token,
        p_status: outcome.status,
        p_error: outcome.code || null,
        p_pause: !!outcome.pause,
      });
      // If persistence fails after SMTP, leave the lease for uncertain-outcome reconciliation.
      if (finishError) throw new Error('Could not record SMTP outcome.');
      console.info('email dispatch', { stage: 'recorded', jobId: job.id, status: outcome.status, code: outcome.code || null });
      processed++;
      if (outcome.pause) break;
    }
    await cleanupAttachments(service);
    console.info('email dispatch', { stage: 'finished', processed });
    return { processed };
  } finally {
    await service
      .from('email_health')
      .update({ worker_token: null, worker_until: null })
      .eq('id', true)
      .eq('worker_token', worker);
  }
}
async function cleanupAttachments(service: SupabaseClient) {
  const orphans = await service.rpc('email_orphan_uploads');
  if (!orphans.error && orphans.data?.length) {
    await service.storage.from('email-attachments').remove(orphans.data.map((file: { path: string }) => file.path));
  }
  const { data: files, error } = await service
    .from('email_attachments')
    .select('id,path')
    .lt('created_at', new Date(Date.now() - 86400000).toISOString())
    .limit(30);
  if (error) return;
  for (const file of files || []) {
    const [drafts, messages] = await Promise.all([
      service
        .from('email_drafts')
        .select('id')
        .contains('attachment_ids', [file.id])
        .limit(1),
      service
        .from('email_messages')
        .select('id')
        .contains('attachment_ids', [file.id])
        .not('html', 'is', null)
        .limit(1),
    ]);
    if (
      drafts.error ||
      messages.error ||
      drafts.data?.length ||
      messages.data?.length
    )
      continue;
    const { error: removeError } = await service.storage
      .from('email-attachments')
      .remove([file.path]);
    if (!removeError)
      await service.from('email_attachments').delete().eq('id', file.id);
  }
}
